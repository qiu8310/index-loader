import { parse, NODE_TYPE as N } from '@mora/module-parse'
import * as fs from 'fs'
import * as path from 'path'
import { PathResolver } from './PathResolver'
import { warn } from './helper'

export interface ExportEntry {
  exported: string
  src: string
  /** 如果 src 和当前文件不一样才需要设置此值 */
  srcExported?: string
}
export interface ImportEntry {
  imported: string
  src: string
  local: string
}

export type Node = ReturnType<typeof parse>['nodes'][0]

export interface FileOptions {
  module?: 'esnext' | 'commonjs' | 'both'
  /**
   * 代码中经常会出现下面这种情况：
   *
   * ```ts
   * import {A} from 'foo'
   * // update A ?
   * export {A}
   * ```
   * 出现的话，是否需要继续解析 A 的实际位置？
   *
   * 默认 true
   */
  recursive?: boolean

  pathResolver: PathResolver
  /** 项目根目录 */
  root: string
  entry: string
}
export class File {
  static resolveCache: Record<string, File> = {}
  static getInstance = (src: string) => File.resolveCache[src]

  isEntry = false
  exports: ({ fromSrc?: string; local: string; exported: string })[] = []
  exportsAllFrom: string[] = []
  exportsEsnextDefault: boolean = false
  exportsCommonDefault: boolean = false

  importsAll: ({ fromSrc: string; local: string })[] = []
  imports: ({ fromSrc: string; local: string; imported: string })[] = []

  private __imports?: Record<string, ImportEntry>
  private __exports?: Record<string, ExportEntry>

  /** 获取依赖的文件 */
  getRequiredFile(node: { src: string }) {
    const resolver = this.options.pathResolver
    const src = resolver.resolve(node.src, this.src)
    if (src) {
      if (!File.resolveCache[src]) File.resolveCache[src] = new File(src, this.options)
      return File.resolveCache[src]
    }
    return null
  }

  resolve(node: { src: string }, cb: (file: File) => void) {
    const file = this.getRequiredFile(node)
    if (file) {
      cb(file)
    }
  }

  getRelative(src: string = this.src) {
    return `"${path.relative(this.options.root, src)}"`
  }

  parseInNode = (node: Node) => {
    switch (node.type) {
      case N.REQUIRE_ONLY:
      case N.IMPORT_ONLY: {
        break
      }

      case N.IMPORT_NAMED:
      case N.REQUIRE_DESTRUCT: {
        this.resolve(node, file => {
          node.variables.forEach(({ local, imported }) => {
            this.imports.push({ fromSrc: file.src, local, imported })
          })
        })
        break
      }
      case N.IMPORT_ALL:
      case N.REQUIRE_ASSIGN: {
        this.resolve(node, file => {
          this.importsAll.push({ fromSrc: file.src, local: node.variable })
        })
        break
      }
    }
  }

  parseOutNode = (node: Node) => {
    switch (node.type) {
      // export
      case N.EXPORT_DEFAULT: {
        this.exportsEsnextDefault = true
        break
      }
      case N.EXPORT_ASSIGN: {
        this.exports.push({ exported: node.exported, local: node.exported })
        break
      }
      case N.EXPORT_NAMED: {
        node.variables.forEach(({ local, exported }) => {
          this.exports.push({ exported, local })
        })
        break
      }

      // export from
      case N.EXPORT_NAMED_FROM: {
        this.resolve(node, file => {
          node.variables.forEach(({ local, exported }) => {
            this.exports.push({ local, exported, fromSrc: file.src })
          })
        })
        break
      }
      case N.EXPORT_ALL_FROM: {
        this.resolve(node, file => this.exportsAllFrom.push(file.src))
        break
      }

      // exports
      case N.EXPORTS_DEFAULT: {
        this.exportsCommonDefault = true
        break
      }
      case N.EXPORTS_VARIABLE: {
        this.exports.push({ local: node.variable, exported: node.variable })
        break
      }
    }
  }

  constructor(public src: string, public options: FileOptions) {
    // 先设置成 resolve 标识
    File.resolveCache[src] = this
    this.isEntry = src === options.entry
    this.parse()
  }

  parse() {
    const content = fs.readFileSync(this.src, 'utf8')
    const { nodes, warnings } = parse(content, { module: this.options.module })
    warnings.forEach(warn)
    nodes.forEach(this.parseInNode)
    nodes.forEach(this.parseOutNode)
  }

  getImports() {
    if (this.__imports) return this.__imports
    const result: Record<string, ImportEntry> = {}
    this.__imports = result

    const add = (entry: ImportEntry) => {
      if (result.hasOwnProperty(entry.local)) {
        warn(`import entry "${entry.local}" already exists in ${this.getRelative()}, ignored`)
      } else {
        result[entry.local] = entry
      }
    }
    this.imports.forEach(it => {
      /*
        a.js
        export {Tar as Foo}

        b.js
        import {Foo as Bar} from 'a.js'

        => entry:
        {
          src: 'a.js',
          imported: 'Foo',
          local: 'Bar',
        }
      */
      const importFile = File.getInstance(it.fromSrc)
      const exportsMap = importFile.getExports()
      if (exportsMap.hasOwnProperty(it.imported)) {
        const ref = exportsMap[it.imported]
        add({ src: ref.src, imported: ref.srcExported || ref.exported, local: it.local })
      } else {
        warn(`${this.getRelative()} import variable "${it.imported}" not exists in ${this.getRelative(it.fromSrc)}`)
      }
    })

    this.importsAll.forEach(it => {
      const importFile = File.getInstance(it.fromSrc)
      add({
        src: importFile.src,
        imported: '*',
        local: it.local
      })
    })
    return result
  }

  getExports() {
    if (this.__exports) return this.__exports
    const result: Record<string, ExportEntry> = {}
    this.__exports = result

    const recursive = this.options.recursive !== false

    const add = (entry: ExportEntry) => {
      if (result.hasOwnProperty(entry.exported)) {
        warn(`export entry "${entry.exported}" already exists in ${this.getRelative()}, ignored`)
      } else {
        result[entry.exported] = entry
      }
    }

    if (this.exportsCommonDefault) {
      add({ src: this.src, exported: '*' })
    }

    if (this.exportsEsnextDefault) {
      add({ src: this.src, exported: 'default' })
    }

    this.exportsAllFrom.forEach(fileSrc => {
      const file = File.getInstance(fileSrc)
      const res = file.getExports()
      Object.keys(res).forEach(k => add(res[k]))
    })

    this.exports.forEach(it => {
      let { exported, local, fromSrc } = it
      if (recursive) {
        /*
        import { Foo as Bar } from './a'
        export { Bar as Tar }

        => export { Foo as Tar } from './a'


        import * as Bar from './a'
        export { Bar as Tar }

        => export { * as Tar } from './a'
        */
        const importsMap = this.getImports()
        if (importsMap.hasOwnProperty(local)) {
          const ref = importsMap[local]
          fromSrc = ref.src
          local = ref.imported // ref.imported 有可能是 '*' （import * as xx from './xx')
        }
      }

      if (fromSrc) {
        const file = File.getInstance(fromSrc)
        const exportsMap = file.getExports()

        /*
          a.js:
          export { Tar as Foo }

          b.js:
          export { Foo as Bar } from './a'

          => entry:
          {
            src: 'a.js',
            exported: 'Bar',
            srcExported: 'Foo',
          }
        */
        if (local === '*') {
          add({ src: fromSrc, exported, srcExported: '*' })
        } else if (exportsMap.hasOwnProperty(local)) {
          const ref = exportsMap[local]
          add({ src: ref.src, exported, srcExported: ref.srcExported || ref.exported })
        } else {
          warn(`${this.getRelative()} export variable "${exported}" not exists in ${this.getRelative(fromSrc)}`)
        }
      } else {
        add({ src: this.src, exported })
      }
    })
    return result
  }
}

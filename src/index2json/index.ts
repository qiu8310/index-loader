import * as fs from 'fs'
import * as path from 'path'
import { FileOptions, File } from './File'
import { PathResolver } from './PathResolver'
import { warn } from './helper'

type Omit<O, K> = Pick<O, Exclude<keyof O, K>>
export interface Options extends Omit<FileOptions, 'root' | 'pathResolver' | 'entry' | 'warnings' | 'isRepeat'> {
  /** 生成的 json 中路径和别名中间的连接符，默认为 "~" */
  glue?: string
  /** 路径解析器 */
  pathResolver?: PathResolver
  /** 是否保留生成的 json 值中的路径的文件中的后缀 */
  reserveExtension?: boolean
}

export function index2json(src: string, options: Options = {}) {
  const pathResolver = options.pathResolver || new PathResolver()
  const root = path.dirname(src)

  // 自动检查使用的 module
  let useModule = options.module
  if (!useModule) {
    const content = fs.readFileSync(src).toString()
    const r1 = /^(import|export)\b/m.test(content)
    const r2 = /^(module|exports)\b/m.test(content)
    useModule = r1 && r2 ? 'both' : r1 ? 'esnext' : r2 ? 'commonjs' : 'both'
  }
  const file = new File(src, { ...options, pathResolver, entry: src, root, warnings: [], module: useModule })
  let result = file.getExports()

  // 解决循环引用的问题
  if (file.options.warnings.length) {
    File.pruneForRepeat()
    file.options.isRepeat = true
    file.options.warnings.length = 0

    result = file.getExports()

    file.options.warnings.forEach(w => warn(w))
  }

  const json: Record<string, string> = {}
  const glue = options.glue || '~'

  Object.keys(result).forEach(key => {
    const exp = result[key]
    const relative = path.relative(root, exp.src)
    /*
      {
        A: 'file'         // import { A } from 'file'           const { A } = require('file')
        B: 'file~B1'      // import { B1 as B } from 'file'     const { B1 as B } = require('file')
        C: 'file~*'       // import * as C from 'file'          const C = require('file')
        D: 'file~default' // import D from 'file'               const D = require('file').default

        // 下面两条只有入口文件才会存在，非入口文件不可能出现
        default: 'file'   // import X from 'file'               const X = require('file').default
        *: 'file'         // import * as X from 'file'          const X = require('file')
      }
     */
    const exportPath = (options.reserveExtension ? relative : relative.replace(/\.js$/, '')).replace(/\\/g, '/')

    if ((!exp.srcExported || exp.exported === exp.srcExported) && exp.srcExported !== 'default') {
      json[exp.exported] = exportPath
    } else {
      json[exp.exported] = exportPath + glue + exp.srcExported
    }
  })

  // 清空 cache
  File.resolveCache = {}
  pathResolver.cache = {}

  return json
}

// const root = path.resolve(__dirname, '..', '..')
// const opts: Options = { module: 'both' }
// console.log(index2json(root + '/node_modules/antd/es/index.js', opts))

// const test = 'warn/import-not-exists'
// const root = path.resolve(__dirname, '..', '..')
// const opts: Options = { module: 'esnext' }
// console.log(index2json(`${root}/src/index2json/__tests__/fixtures/${test}/index.js`, opts))

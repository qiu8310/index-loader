import * as fs from 'fs'
import * as path from 'path'
import { FileOptions, File } from './File'
import { PathResolver } from './PathResolver'

type Omit<O, K> = Pick<O, Exclude<keyof O, K>>
export interface Options extends Omit<FileOptions, 'root' | 'pathResolver'> {
  glue?: string
  pathResolver?: PathResolver
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
  const file = new File(src, { ...options, pathResolver, root, module: useModule })
  const result = file.getExports()

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
    if ((!exp.srcExported || exp.exported === exp.srcExported) && exp.srcExported !== 'default') {
      json[exp.exported] = relative
    } else {
      json[exp.exported] = relative + glue + exp.srcExported
    }
  })

  // 清空 cache
  File.resolveCache = {}
  pathResolver.cache = {}

  return json
}

// console.log(index2json('/Users/Mora/Workspace/ypp/admin/node_modules/antd/es/row/index.js', { module: 'esnext' }))

console.log(
  index2json(
    '/Users/Mora/Workspace/ypp/index-loader/src/index2json/__tests__/fixtures/esnext/export-default/index.js',
    {
      module: 'esnext'
    }
  )
)

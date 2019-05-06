import * as path from 'path'
import * as fs from 'fs'
import { warn, cache } from './helper'

export class PathResolver {
  cache: Record<string, string | false> = {}
  /**
   * 在 srcFile 文件中使用了 require(requiredPath)
   *
   * 返回解析后的 requiredPath 的绝对地址
   *
   * 如果不需要解析，直接返回一个 falsy 字段
   *
   * 不能解析 json 文件
   */
  resolve(requiredPath: string, srcFile: string) {
    return cache(this.cache, `${requiredPath}:${srcFile}`, () => {
      if (!requiredPath.startsWith('.')) return false
      if (requiredPath.endsWith('.json')) return false

      let file = path.resolve(path.dirname(srcFile), ...requiredPath.split('/'))
      if (requiredPath.endsWith('/')) {
        file = path.join(file, 'index.js')
        if (isFile(file)) return file
      } else {
        const f = [file, file + '.js', path.join(file, 'index.js')].find(f => isFile(f))
        if (f) return f
      }
      warn(`can not resolve "${requiredPath}" in file ${srcFile}`)
      return false
    })
  }
}

function isFile(file: string) {
  try {
    return fs.statSync(file).isFile()
  } catch (e) {
    return false
  }
}

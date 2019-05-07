import * as findup from 'mora-scripts/libs/fs/findup'
import * as exists from 'mora-scripts/libs/fs/exists'
import * as _warn from 'mora-scripts/libs/sys/warn'
import * as _info from 'mora-scripts/libs/sys/info'
import * as _error from 'mora-scripts/libs/sys/error'
import * as path from 'path'

export interface IEnvResult {
  rootDir: string
  // package.json 文件中可以指定 typings 文件路径
  // pkg: {typings?: string}
}

const envCache: IEnvResult[] = []

/**
 * 根据项目中的某一个文件，获取当前项目的一些基本信息
 */
export function env(srcFile: string): IEnvResult {
  for (let cache of envCache) {
    if (srcFile.indexOf(cache.rootDir) === 0) return cache
  }

  let pkgFile = findup.pkg(path.dirname(srcFile))
  let result = {
    // pkg: require(pkgFile),
    rootDir: path.dirname(pkgFile)
  }
  envCache.push(result)
  return result
}

/**
 * 祛除单行中的注释
 */
export function stripInlineComment(line: string): string {
  return line.replace(/\/\*.*?\*\//g, '')
}

export function isFileExists(file: string): boolean {
  return exists(file)
}

export function warn(...args: any[]) {
  _warn('[index-loader]', ...args)
}

export function info(...args: any[]) {
  _info(...args)
}

export function error(...args: any[]) {
  _error('[index-loader]', ...args)
}

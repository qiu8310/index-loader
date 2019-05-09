import path = require('path')
import fs = require('fs')
import os = require('os')
import webpack = require('webpack')
import utils = require('loader-utils')
import { index2json } from './index2json/'
import { warn } from './index2json/helper'

export type Target = MapTarget | ModuleTarget

interface BaseTarget {
  name: string
  /** 输出替换信息 */
  debug?: boolean
  /** 添加额外的代码 */
  additional?: (src: string, variables: string[], target: ResolvedTarget) => void | string | string[]
  /** 获取依赖的相对路径（注意，最好返回 unix 系统的路径） */
  getRequiredPath?: (
    /**
     * 依赖的变量名，如
     * `import { A } from 'antd'` 中的 "A"
     */
    importedKey: string,
    /**
     * 模块名，如
     * `import { A } from 'antd'` 中的 "antd"
     */
    importFrom: string,
    /**
     * 当前所在的文件
     */
    contextFile: string,
    /**
     * 依赖的文件解析后的路径
     */
    requiredFile: string,
    target: ResolvedTarget
  ) => string
}
export interface MapTarget extends BaseTarget {
  mapFile: string | ((targetName: string) => string)
  /** 项目根目录，默认使用 mapFile 的目录 */
  rootDir?: string
}
export interface ModuleTarget extends BaseTarget {
  /** entry file 的 module 类型 */
  entryModule?: 'esnext' | 'commonjs' | 'both'
  entryFile: string | ((targetName: string) => string)
  /** 是否缓存生成的 map 信息 */
  cache?: boolean
  cacheFile?: string
}

interface ResolvedTarget extends Required<BaseTarget> {
  getJson: (targetName: string) => Record<string, string>
  getRootDir: (targetName: string) => string
}

export interface IndexLoaderOptions {
  debug?: boolean
  additional?: BaseTarget['additional']
  targets: Target[]
}

function isMapTarget(t: Target): t is MapTarget {
  return !!(t as MapTarget).mapFile
}
function isModuleTarget(t: Target): t is ModuleTarget {
  return !!(t as ModuleTarget).entryFile
}
const getExportImportExpReg: (name: string) => RegExp = (() => {
  let cache: { [key: string]: RegExp } = {}
  return (name: string) => {
    if (!cache[name])
      cache[name] = new RegExp(`^([ \\t]*)(import|export)\\s+\\{([^}]+)\\}\\s+from\\s+(['"])(${name})\\4`, 'mg')
    return cache[name]
  }
})()

// for test
export const JSON_MEMORY_CACHE: any = {}

export default function loader(this: webpack.loader.LoaderContext, content: string) {
  const { targets = [], ...rest } = utils.getOptions(this) as IndexLoaderOptions
  const additional = () => {}
  const allTargets: ResolvedTarget[] = targets.map(t => {
    const basic = {
      debug: (t.hasOwnProperty('debug') ? t.debug : rest.debug) || false,
      name: t.name,
      additional: t.additional || rest.additional || additional,
      getRequiredPath: t.getRequiredPath || getRequiredPath
    }
    if (isMapTarget(t)) {
      return {
        ...basic,
        getJson: (targetName: string) => require(getMapTargetMapFile(t, targetName)),
        getRootDir: (targetName: string) => t.rootDir || path.dirname(getMapTargetMapFile(t, targetName))
      }
    } else if (isModuleTarget(t)) {
      return {
        ...basic,
        getJson: (targetName: string) => getModuleTargetJson(t, targetName),
        getRootDir: (targetName: string) => path.dirname(getModuleTargetEntryFile(t, targetName))
      }
    } else {
      throw new Error(`Config ${JSON.stringify(t)} lack "mapFile" or "entryFile" field`)
    }
  })
  return replaceAll(this.resourcePath, content, allTargets)
}

function getModuleTargetJson(t: ModuleTarget, targetName: string) {
  let json: ReturnType<typeof index2json> | null = null
  const entryFile = getModuleTargetEntryFile(t, targetName)
  if (JSON_MEMORY_CACHE[entryFile]) return JSON_MEMORY_CACHE[entryFile]

  const rootDir = path.dirname(entryFile)
  const useCache = t.cache !== false
  const cacheFile = t.cacheFile || path.join(rootDir, `index-json.${targetName.replace(/\//g, '-')}.cache`)
  if (useCache) {
    const cacheJson = getCacheJson(cacheFile)
    if (cacheJson) json = cacheJson
  }
  if (!json) {
    json = index2json(entryFile, { module: t.entryModule })
    if (useCache) setCacheJson(cacheFile, json)
  }

  JSON_MEMORY_CACHE[entryFile] = json
  return json
}
function getModuleTargetEntryFile(t: ModuleTarget, targetName: string) {
  return typeof t.entryFile === 'function' ? t.entryFile(targetName) : t.entryFile
}
function getMapTargetMapFile(t: MapTarget, targetName: string) {
  return typeof t.mapFile === 'function' ? t.mapFile(targetName) : t.mapFile
}

function replaceAll(contextFile: string, content: string, targets: ResolvedTarget[]) {
  return targets.reduce((result: string, target) => {
    const regexp = getExportImportExpReg(target.name)

    return result.replace(
      regexp,
      (raw: string, preSpaces: string, inOut: string, namedObject: string, quote: string, targetName: string) => {
        const json = target.getJson(targetName)
        const rootDir = target.getRootDir(targetName)

        const result: { [src: string]: string[] } = {}
        parseNamedObject(namedObject).forEach(obj => {
          if (!json.hasOwnProperty(obj.key)) {
            throw new Error(`There is no "${obj.key}" module in package "${targetName}"`)
          }
          let [unixPath, alias] = json[obj.key].split('~')
          let requiredFile = path.resolve(rootDir, ...unixPath.split('/'))
          if (unixPath.endsWith('/')) requiredFile += path.sep

          let requirePath = target.getRequiredPath(obj.key, targetName, contextFile, requiredFile, target)

          const from = alias || obj.key
          const to = obj.as || obj.key
          const item = from === to ? from : `${from} as ${to}`

          if (!result[requirePath]) result[requirePath] = []
          if (!result[requirePath].includes(item)) result[requirePath].push(item)
        })

        const rows = Object.keys(result)
          .reduce(
            (all, requirePath) => {
              const variables = result[requirePath]
              if (variables.length) {
                all.push(`${preSpaces}${inOut} { ${variables.join(', ')} } from ${quote}${requirePath}${quote}`)
              }
              const extra = target.additional(requirePath, variables, target)
              if (Array.isArray(extra)) {
                all.push(...extra)
              } else if (typeof extra === 'string') {
                all.push(extra)
              }
              return all
            },
            [] as string[]
          )
          .join('\n')

        if (target.debug) {
          debug(`${os.EOL}::::: ${contextFile} :::::`)
          debug(`${raw}  =>  ${os.EOL}${rows}`)
        }
        return rows
      }
    )
  }, content)
}

function parseNamedObject(str: string) {
  return stripInlineComment(str)
    .trim()
    .split(',')
    .reduce(
      (res, part) => {
        part = part.trim()
        if (part) {
          const [key, as] = part.split(/\s+as\s+/)
          res.push({ key, as })
        }
        return res
      },
      [] as ({ key: string; as?: string })[]
    )
}

/**
 * 祛除单行中的注释
 */
function stripInlineComment(line: string): string {
  return line.replace(/\/\*.*?\*\//g, '')
}

function debug(msg: string) {
  console.log('\x1b[36m' + msg + '\x1b[0m')
}

function slash(str: string) {
  return str.replace(/\\/g, '/')
}
function getRequiredPath(
  importedKey: string,
  importFrom: string,
  contextFile: string,
  requiredFile: string
  // target: ResolvedTarget
) {
  // 优先使用相对路径

  // 先判断是不是在 node_modules 中
  let requirePath = slash(requiredFile)
  const index = requirePath.indexOf(`/node_modules/${importFrom}/`)
  if (index >= 0) {
    requirePath = requirePath.substr(index + '/node_modules/'.length)
    return requirePath
  }

  // 再使用相对路径
  let relativeFile = path.relative(path.dirname(contextFile), requiredFile)
  if (!path.isAbsolute(relativeFile)) {
    if (relativeFile.startsWith('.')) return slash(relativeFile)
    return './' + slash(relativeFile)
  }

  // 使用绝对路径，window 系统下路径要转义
  return requiredFile.replace(/\\/g, '\\\\')
}

function getCacheJson(cacheFile: string) {
  try {
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile).toString())
    }
  } catch (e) {}
  return null
}
function setCacheJson(cacheFile: string, json: any) {
  const dir = path.dirname(cacheFile)
  try {
    // @ts-ignore
    fs.mkdirSync(dir, { recursive: true })
  } catch (e) {}

  if (!fs.existsSync(dir)) {
    warn(`create cache directory ${dir} failed`)
  } else {
    fs.writeFileSync(cacheFile, JSON.stringify(json))
  }
}

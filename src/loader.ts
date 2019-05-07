import path = require('path')
import webpack = require('webpack')
import utils = require('loader-utils')
// import { index2json } from './index2json/'

interface Target {
  debug: boolean
  mapFile: string
  moduleFile?: string
  esModuleFile?: string
  commonModuleFile?: string

  // 生成的内容，不需要配置
  map: any

  name: string
  additional?: (src: string, variables: string[]) => void | string | string[]
}

const getExportImportExpReg: (name: string) => RegExp = (() => {
  let cache: { [key: string]: RegExp } = {}
  return (name: string) => {
    if (!cache[name])
      cache[name] = new RegExp(`^([ \\t]*)(import|export)\\s+\\{([^}]+)\\}\\s+from\\s+(['"])${name}\\4`, 'mg')
    return cache[name]
  }
})()

export default function loader(this: webpack.loader.LoaderContext, content: string) {
  const { targets = [], ...rest } = utils.getOptions(this)
  const allTargets: Target[] = targets.map((t: Target) => {
    let map
    let mapFile = t.mapFile
    if (!t.mapFile) {
      // if (t.esModuleFile) {
      //   mapFile = t.esModuleFile
      //   map = index2json(t.esModuleFile, 'esnext')
      // } else if (t.commonModuleFile) {
      //   mapFile = t.commonModuleFile
      //   map = index2json(t.commonModuleFile, 'commonjs')
      // } else if (t.moduleFile) {
      //   mapFile = t.moduleFile
      //   map = index2json(t.moduleFile, 'both')
      // } else {
      //   throw new Error(`Need mapFile/esModuleFile/commonModuleFile/moduleFile file config`)
      // }
    } else {
      map = require(t.mapFile)
    }
    return {
      debug: false,
      ...rest,
      ...t,
      map,
      mapFile
    }
  })
  return replaceAll(this.resourcePath, content, allTargets)
}

function replaceAll(filename: string, content: string, targets: Target[]) {
  return targets.reduce((result: string, target) => {
    const regexp = getExportImportExpReg(target.name)

    return result.replace(
      regexp,
      (raw: string, preSpaces: string, inOut: string, namedObject: string, quote: string) => {
        const map = target.map
        const result: { [src: string]: string[] } = {}
        parseNamedObject(namedObject).forEach(obj => {
          if (!map.hasOwnProperty(obj.key)) {
            throw new Error(`There is no "${obj.key}" module in package "${target.name}"`)
          }
          let [file, alias] = map[obj.key].split('~')
          file = path.resolve(path.dirname(target.mapFile), file)
          let src = file.replace(/\\/g, '/')
          if (src.indexOf('/node_modules/') >= 0) {
            src = src.substr(src.indexOf('/node_modules/') + '/node_modules/'.length)
          }

          const from = alias || obj.key
          const to = obj.as || obj.key
          const item = from === to ? from : `${from} as ${to}`

          if (!result[src]) result[src] = []
          if (!result[src].includes(item)) {
            result[src].push(item)
          }
        })

        const rows = Object.keys(result)
          .reduce(
            (all, src) => {
              const variables = result[src]
              if (variables.length) {
                all.push(`${preSpaces}${inOut} { ${variables.join(', ')} } from ${quote}${src}${quote}`)
              }
              const extra = target.additional && target.additional(src, variables)
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
          debug(`---------- ${filename} -----------`)
          debug(`REPLACE [${raw}] WITH\n${rows}`)
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

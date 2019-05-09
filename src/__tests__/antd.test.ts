import loader, { ModuleTarget, JSON_MEMORY_CACHE } from '../loader'
import webpack = require('webpack')
import os = require('os')
import fs = require('fs')
import path = require('path')

const root = path.resolve(__dirname, '..', '..')

const TARGET: ModuleTarget = {
  name: 'antd',
  cache: false,
  entryFile: path.join(root, ...'node_modules/antd/es/index.js'.split('/'))
}

function getContext(target: Partial<ModuleTarget> = {}): webpack.loader.LoaderContext {
  return {
    resourcePath: __filename,
    query: {
      debug: false,
      targets: [{ ...TARGET, ...target }]
    }
  } as any
}

function interpolate(statement: string, ctx?: any) {
  return loader.call(ctx || getContext(), statement)
}
function transformTest(from: string, to: string, ctx?: any) {
  expect(interpolate(from, ctx)).toEqual(to)
}

describe('antd', () => {
  beforeEach(() => Object.keys(JSON_MEMORY_CACHE).forEach(k => delete JSON_MEMORY_CACHE[k]))

  test('single component', () => {
    transformTest('import { Button } from "antd"', 'import { default as Button } from "antd/es/button/button"')
    transformTest('import { Affix } from "antd"', 'import { default as Affix } from "antd/es/affix/index"')
    transformTest('import { Anchor } from "antd"', 'import { default as Anchor } from "antd/es/anchor/Anchor"')
    transformTest('import { BackTop } from "antd"', 'import { default as BackTop } from "antd/es/back-top/index"')
  })

  test('multiple components', () => {
    transformTest(
      'import { Button, Affix } from "antd"',
      'import { default as Button } from "antd/es/button/button"\nimport { default as Affix } from "antd/es/affix/index"'
    )
  })

  test('regexp name', () => {
    const ctx = getContext({
      name: '.*',
      entryFile: name => path.join(root, ...`node_modules/${name}/es/index.js`.split('/'))
    })
    transformTest('import { Button } from "antd"', 'import { default as Button } from "antd/es/button/button"', ctx)
  })

  test('getRequiredPath', () => {
    const ctx = getContext({
      getRequiredPath: (key, name, contextFile, requiredFile) => {
        expect(contextFile).toEqual(contextFile)
        expect(requiredFile.includes('antd/es/button/button')).toEqual(true)
        return `${name}/${key.toLowerCase()}`
      }
    })
    transformTest('import { Button } from "antd"', 'import { default as Button } from "antd/button"', ctx)
  })

  test('set cache', () => {
    const cacheFile = path.join(os.tmpdir(), Math.random().toString())
    const ctx = getContext({ cache: true, cacheFile })
    transformTest('import { Button } from "antd"', 'import { default as Button } from "antd/es/button/button"', ctx)
    expect(fs.existsSync(cacheFile)).toEqual(true)
    fs.unlinkSync(cacheFile)
  })

  test('get cache', () => {
    const cacheFile = path.join(os.tmpdir(), Math.random().toString())
    const ctx = getContext({ cache: true, cacheFile })
    fs.writeFileSync(cacheFile, JSON.stringify({ Button: 'button' }))
    transformTest('import { Button } from "antd"', 'import { Button } from "antd/es/button"', ctx)
    fs.unlinkSync(cacheFile)
  })
})

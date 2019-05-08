import loader, { IndexLoaderOptions } from '../loader'
import webpack = require('webpack')
import path = require('path')

const root = path.resolve(__dirname)
let context: webpack.loader.LoaderContext = {
  resourcePath: __filename,
  query: {
    debug: false,
    targets: [{ name: '@a/b', mapFile: path.join(root, 'loader.map.json') }]
  }
} as any

function interpolate(statement: string, ctx?: any) {
  return loader.call(ctx || context, statement)
}
function transformTest(from: string, to: string, ctx?: any) {
  expect(interpolate(from, ctx)).toEqual(to)
}

describe('single', () => {
  test('named export', () => {
    transformTest('import {SwipeItem} from "@a/b"', 'import { SwipeItem } from "./swipe"')
  })

  test('default export', () => {
    transformTest('import {Marquee} from "@a/b"', 'import { default as Marquee } from "./marquee"')
  })

  test('alias export', () => {
    transformTest('import {Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"')
  })

  test('alias as export', () => {
    transformTest('import {Swipe as B} from "@a/b"', 'import { S as B } from "./swipe"')
    transformTest('import {Swipe as S} from "@a/b"', 'import { S } from "./swipe"')
  })
})

describe('multiple', () => {
  test('named import', () => {
    transformTest(
      'import {SwipeItem, Marquee} from "@a/b"',
      'import { SwipeItem } from "./swipe"\nimport { default as Marquee } from "./marquee"'
    )
  })

  test('additional import', () => {
    const fn: Required<IndexLoaderOptions>['additional'] = (val, variables) => {
      expect(val).toEqual('./swipe')
      expect(variables).toEqual(['S as Swipe'])
      return 'import "abc.css"'
    }
    const ctx = { ...context, query: { ...context.query, additional: fn } }
    transformTest('import {Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"\nimport "abc.css"', ctx)
  })
})

describe('debug', () => {
  test('debug import', () => {
    const log = jest.spyOn(console, 'log')
    log.mockImplementation(() => {})
    const c = { ...context, query: { ...context.query, debug: true } }
    loader.call(c, 'import {SwipeItem, Marquee} from "@a/b"')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('error', () => {
  test('key no in map', () => {
    expect(() => {
      interpolate('import {xxx} from "@a/b"')
    }).toThrow()
  })
})

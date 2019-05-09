import loader, { IndexLoaderOptions, MapTarget } from '../loader'
import webpack = require('webpack')
import path = require('path')

const root = path.resolve(__dirname)

const TARGET: MapTarget = {
  name: '@a/b',
  mapFile: path.join(root, 'fixtures', 'loader.map.json'),
  rootDir: root
}

function getContext(
  target: Partial<MapTarget> = {},
  query: Partial<IndexLoaderOptions> = {}
): webpack.loader.LoaderContext {
  return {
    resourcePath: __filename,
    query: {
      debug: false,
      targets: [{ ...TARGET, ...target }],
      ...query
    }
  } as any
}

function interpolate(statement: string, ctx?: any) {
  return loader.call(ctx || getContext(), statement)
}
function transformTest(from: string, to: string, ctx?: any) {
  expect(interpolate(from, ctx)).toEqual(to)
}

describe('single', () => {
  test('named import', () => {
    transformTest('import {SwipeItem} from "@a/b"', 'import { SwipeItem } from "./swipe"')
  })

  test('default import', () => {
    transformTest('import {Marquee} from "@a/b"', 'import { default as Marquee } from "./marquee"')
  })

  test('alias import', () => {
    transformTest('import {Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"')
  })

  test('alias as import', () => {
    transformTest('import {Swipe as B} from "@a/b"', 'import { S as B } from "./swipe"')
    transformTest('import {Swipe as S} from "@a/b"', 'import { S } from "./swipe"')
  })

  test('repeat import', () => {
    transformTest('import {Swipe, Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"')
  })
})

describe('multiple', () => {
  test('named import', () => {
    transformTest(
      'import {SwipeItem, Marquee} from "@a/b"',
      'import { SwipeItem } from "./swipe"\nimport { default as Marquee } from "./marquee"'
    )
  })

  test('additional import string', () => {
    const fn: Required<IndexLoaderOptions>['additional'] = (val, variables) => {
      expect(val).toEqual('./swipe')
      expect(variables).toEqual(['S as Swipe'])
      return 'import "abc.css"'
    }
    const ctx = getContext({ additional: fn })
    transformTest('import {Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"\nimport "abc.css"', ctx)
  })

  test('additional import array', () => {
    const ctx = getContext({ additional: () => ['import "a"', 'import "b"'] })
    transformTest('import {Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"\nimport "a"\nimport "b"', ctx)
  })

  test('additional import void', () => {
    const ctx = getContext({ additional: () => {} })
    transformTest('import {Swipe} from "@a/b"', 'import { S as Swipe } from "./swipe"', ctx)
  })
})

describe('config', () => {
  test('not replace', () => {
    transformTest('import {Swipe} from "@fe/a"', 'import {Swipe} from "@fe/a"')
    transformTest('import {Swipe} from "@fe/b"', 'import {Swipe} from "@fe/b"')
  })

  test('dynamic replace', () => {
    const ctx = getContext({
      name: '@fe/[ab]',
      mapFile: name => {
        return path.join(root, 'fixtures', name.split('/')[1])
      }
    })
    transformTest('import {Swipe} from "@fe/a"', 'import { Swipe } from "./file/a"', ctx)
    transformTest('import {Swipe} from "@fe/b"', 'import { Swipe } from "./file/b"', ctx)
  })

  test('use mapFile dir as rootDir', () => {
    transformTest(
      'import {SwipeItem} from "@a/b"',
      'import { SwipeItem } from "./fixtures/swipe"',
      getContext({ rootDir: '' })
    )
  })

  test('calculate relative file', () => {
    transformTest(
      'import {SwipeItem} from "@a/b"',
      'import { SwipeItem } from "../swipe"',
      getContext({ rootDir: path.dirname(root) })
    )
  })
})

describe('debug', () => {
  test('debug import', () => {
    const log = jest.spyOn(console, 'log')
    log.mockImplementation(() => {})
    interpolate('import {SwipeItem, Marquee} from "@a/b"', getContext({ debug: true }))
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

  test('lack mapFile or entryFile', () => {
    expect(() => {
      interpolate('', getContext({ mapFile: '' }))
    }).toThrow(/lack "mapFile" or "entryFile" field/)
  })

  test('targets is undefined', () => {
    expect(() => {
      interpolate('', getContext({}, { targets: undefined }))
    }).not.toThrow()
  })
})

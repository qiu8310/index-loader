import loader from '../index'
import webpack = require('webpack')
import path = require('path')

const root = path.resolve(__dirname)
let context: webpack.loader.LoaderContext = {
  resourcePath: '/a/b.js',
  query: {
    debug: false,
    targets: [{ name: '@fe/lego', mapFile: path.join(root, 'index.map.json') }]
  }
} as any

describe('single', () => {
  test('named export', () => {
    expect(loader.call(context, 'import {SwipeItem} from "@fe/lego"')).toEqual(
      `import { SwipeItem } from "${src('swipe')}"`
    )
  })

  test('default export', () => {
    expect(loader.call(context, 'import {Marquee} from "@fe/lego"')).toEqual(
      `import { default as Marquee } from "${src('marquee')}"`
    )
  })

  test('alias export', () => {
    expect(loader.call(context, 'import {Swipe} from "@fe/lego"')).toEqual(
      `import { S as Swipe } from "${src('swipe')}"`
    )
  })

  test('alias as export', () => {
    expect(loader.call(context, 'import {Swipe as B} from "@fe/lego"')).toEqual(
      `import { S as B } from "${src('swipe')}"`
    )

    expect(loader.call(context, 'import {Swipe as S} from "@fe/lego"')).toEqual(`import { S } from "${src('swipe')}"`)
  })
})

describe('multiple', () => {
  test('named import', () => {
    expect(loader.call(context, 'import {SwipeItem, Marquee} from "@fe/lego"')).toEqual(
      `import { SwipeItem } from "${src('swipe')}"\nimport { default as Marquee } from "${src('marquee')}"`
    )
  })

  test('additional import', () => {
    const fn = jest.fn((...args) => 'import "abc.css"')
    const c = { ...context, query: { ...context.query, additional: fn } }
    expect(loader.call(c, 'import {Swipe} from "@fe/lego"')).toEqual(
      `import { S as Swipe } from "${src('swipe')}"\nimport "abc.css"`
    )
    expect(fn).toBeCalledWith(src('swipe'), ['S as Swipe'])
  })
})

describe('debug', () => {
  test('debug import', () => {
    const log = jest.spyOn(console, 'log')
    const c = { ...context, query: { ...context.query, debug: true } }
    loader.call(c, 'import {SwipeItem, Marquee} from "@fe/lego"')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('error', () => {
  test('key no in map', () => {
    expect(() => {
      loader.call(context, 'import {xxx} from "@fe/lego"')
    }).toThrow()
  })
})

function src(f: string) {
  return path.join(root, f).replace(/\\/g, '/')
}

import * as fs from 'fs'
import * as path from 'path'
import { index2json } from '../index'

const ONLY_GROUPS: string[] = []
const ONLY_NAMES: string[] = []

const fixtures = path.resolve(__dirname, 'fixtures')
readdir(fixtures).forEach(group => {
  let desc = ONLY_GROUPS.length && !ONLY_GROUPS.includes(group) ? describe.skip : describe
  desc(group, () => {
    readdir(path.join(fixtures, group)).forEach(name => {
      let test = ONLY_NAMES.length && !ONLY_NAMES.includes(name) ? it.skip : it
      test(name, () => {
        const spy = jest.spyOn(console, 'log')
        spy.mockImplementation(() => {})

        const root = path.join(fixtures, group, name)
        const useModule = ['esnext', 'commonjs'].includes(group)
        let opts = useModule ? { module: group as 'both' } : undefined
        const optsFile = path.join(root, 'options.js')
        if (fs.existsSync(optsFile)) opts = { ...opts, ...require(optsFile) }
        const json = index2json(path.join(root, 'index.js'), opts)

        if (group === 'warn') {
          const expected = require(path.join(root, 'index.json.js'))
          expect(spy).toHaveBeenCalledTimes(expected.length)
          for (let i = 0; i < expected.length; i++) {
            expect(spy).toHaveBeenNthCalledWith(i + 1, '\x1b[33m [index-loader] ' + expected[i] + '\x1b[0m')
          }
        } else {
          const expected = require(path.join(root, 'index.json.js'))
          expect(json).toEqual(expected)
        }

        spy.mockRestore()
      })
    })
  })
})

function readdir(dir: string) {
  return fs.readdirSync(dir).filter(n => !n.startsWith('.'))
}

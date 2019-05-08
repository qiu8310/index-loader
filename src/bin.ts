#!/usr/bin/env node

import { index2json } from './index2json/'
import * as path from 'path'
import * as fs from 'fs'
import * as util from 'util'

process.argv.slice(2).forEach(f => {
  f = path.resolve(f)
  if (existsSync(f)) {
    console.log(util.inspect(index2json(f), { colors: true, depth: null }))
  }
})

function existsSync(f: string) {
  try {
    return fs.existsSync(f)
  } catch (e) {
    return false
  }
}

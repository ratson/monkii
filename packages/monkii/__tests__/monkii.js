'use strict'

const execa = require('execa')
const globby = require('globby')

const monkii = require('..')

test('export factory function', () => {
  expect(monkii).toBeInstanceOf(Function)
})

test('run by node', async () => {
  const files = await globby('../lib/*.js', { cwd: __dirname, absolute: true })
  await Promise.all(files.map(file => execa('node', [file])))
})

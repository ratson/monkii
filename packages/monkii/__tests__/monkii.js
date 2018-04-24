import execa from 'execa'
import globby from 'globby'

import test from 'ava'

import monkii from '..'

test('export factory function', t => {
  t.true(typeof monkii === 'function')
})

test('run by node', async t => {
  const files = await globby('../lib/*.js', { cwd: __dirname, absolute: true })
  await Promise.all(files.map(file => execa('node', [file])))
  t.pass()
})

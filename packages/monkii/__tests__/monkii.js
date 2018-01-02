'use strict'

const monkii = require('..')

test('export factory function', () => {
  expect(monkii).toBeInstanceOf(Function)
})

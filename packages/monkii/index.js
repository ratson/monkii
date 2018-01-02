'use strict'

const { cast, id } = require('./lib/helpers')
const Collection = require('./lib/collection')
const Manager = require('./lib/manager')

function monkii(uri, opts, fn) {
  const manager = new Manager(uri, opts, fn)
  return manager
}

module.exports = monkii
module.exports.default = monkii

module.exports.Collection = Collection
module.exports.Manager = Manager

module.exports.cast = cast
module.exports.id = id

'use strict'

function compose(funcs) {
  if (funcs.length === 0) {
    return args => args
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => args => a(b(args)))
}

module.exports = compose

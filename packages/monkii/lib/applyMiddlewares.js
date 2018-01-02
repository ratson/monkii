'use strict'

const compose = require('./compose')

function applyMiddleware(middlewares) {
  return (monkInstance, collection) => {
    let chain = []

    const middlewareAPI = {
      monkInstance,
      collection,
    }
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    return compose(chain)
  }
}

module.exports = applyMiddleware

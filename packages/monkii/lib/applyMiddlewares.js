'use strict'

const compose = require('./compose')

function applyMiddleware(middlewares) {
  return (monkInstance, collection) => {
    const middlewareAPI = {
      monkInstance,
      collection,
    }
    return compose(middlewares.map(middleware => middleware(middlewareAPI)))
  }
}

module.exports = applyMiddleware

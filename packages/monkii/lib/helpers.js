'use strict'

const { ObjectID } = require('mongodb')

exports.id = str => {
  if (str == null) return ObjectID()
  return typeof str === 'string' ? ObjectID.createFromHexString(str) : str
}

function cast(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cast)
  }

  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(k => {
      /* eslint-disable no-param-reassign */
      if (k === '_id' && obj._id) {
        if (obj._id.$in) {
          obj._id.$in = obj._id.$in.map(exports.id)
        } else if (obj._id.$nin) {
          obj._id.$nin = obj._id.$nin.map(exports.id)
        } else if (obj._id.$ne) {
          obj._id.$ne = exports.id(obj._id.$ne)
        } else {
          obj._id = exports.id(obj._id)
        }
      } else {
        obj[k] = cast(obj[k])
      }
      /* eslint-enable no-param-reassign */
    })
  }

  return obj
}

exports.cast = cast

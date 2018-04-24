'use strict'

const applyMiddlewares = require('./applyMiddlewares')

class Collection {
  constructor(manager, name, options) {
    this.manager = manager
    this.name = name
    this.options = options

    this.middlewares = this.options.middlewares || []
    delete this.options.middlewares

    this.createIndex = this.createIndex.bind(this)
    this.index = this.ensureIndex
    this.dropIndex = this.dropIndex.bind(this)
    this.indexes = this.indexes.bind(this)
    this.dropIndexes = this.dropIndexes.bind(this)
    this.update = this.update.bind(this)
    this.remove = this.remove.bind(this)
    this.findOneAndUpdate = this.findOneAndUpdate.bind(this)
    this.findOneAndDelete = this.findOneAndDelete.bind(this)
    this.insert = this.insert.bind(this)
    this.find = this.find.bind(this)
    this.distinct = this.distinct.bind(this)
    this.count = this.count.bind(this)
    this.findOne = this.findOne.bind(this)
    this.aggregate = this.aggregate.bind(this)
    this.drop = this.drop.bind(this)

    this._dispatch = applyMiddlewares(this.middlewares)(manager, this)
  }

  aggregate(stages, opts, fn) {
    if (typeof opts === 'function') {
      /* eslint-disable no-param-reassign */
      fn = opts
      opts = {}
      /* eslint-enable no-param-reassign */
    }

    return this._dispatch(args =>
      args.col.aggregate(args.stages, args.options).toArray(),
    )({ options: opts, stages, callback: fn }, 'aggregate')
  }

  bulkWrite(operations, opts, fn) {
    if (typeof opts === 'function') {
      /* eslint-disable no-param-reassign */
      fn = opts
      opts = {}
      /* eslint-enable no-param-reassign */
    }

    return this._dispatch(args =>
      args.col.bulkWrite(args.operations, args.options),
    )({ options: opts, operations, callback: fn }, 'bulkWrite')
  }

  count(query, opts, fn) {
    if (typeof opts === 'function') {
      /* eslint-disable no-param-reassign */
      fn = opts
      opts = {}
      /* eslint-enable no-param-reassign */
    }

    return this._dispatch(args => args.col.count(args.query, args.options))(
      { options: opts, query, callback: fn },
      'count',
    )
  }

  createIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      /* eslint-disable no-param-reassign */
      fn = opts
      opts = {}
      /* eslint-enable no-param-reassign */
    }

    return this._dispatch(args =>
      args.col.createIndex(args.fields, args.options),
    )({ options: opts, fields, callback: fn }, 'createIndex')
  }

  distinct(field, query, opts, fn) {
    /* eslint-disable no-param-reassign */
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    if (typeof query === 'function') {
      fn = query
      query = {}
    }
    /* eslint-enable no-param-reassign */

    return this._dispatch(args =>
      args.col.distinct(args.field, args.query, args.options),
    )(
      {
        options: opts,
        query,
        field,
        callback: fn,
      },
      'distinct',
    )
  }

  drop(fn) {
    return this._dispatch(args =>
      args.col.drop().catch(err => {
        if (err && err.message === 'ns not found') {
          return 'ns not found'
        }
        throw err
      }),
    )({ callback: fn }, 'drop')
  }

  dropIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      /* eslint-disable no-param-reassign */
      fn = opts
      opts = {}
      /* eslint-enable no-param-reassign */
    }

    return this._dispatch(args =>
      args.col.dropIndex(args.fields, args.options),
    )({ options: opts, fields, callback: fn }, 'dropIndex')
  }

  dropIndexes(fn) {
    this._dispatch(args => args.col.dropIndexes())(
      { callback: fn },
      'dropIndexes',
    )
  }

  ensureIndex(fields, opts, fn) {
    if (typeof opts === 'function') {
      /* eslint-disable no-param-reassign */
      fn = opts
      opts = {}
      /* eslint-enable no-param-reassign */
    }

    console.warn(
      'DEPRECATED (collection.ensureIndex): use collection.createIndex instead (see https://Automattic.github.io/monk/docs/collection/createIndex.html)',
    )

    return this._dispatch(args =>
      args.col.ensureIndex(args.fields, args.options),
    )({ options: opts, fields, callback: fn }, 'ensureIndex')
  }

  /* eslint-disable no-param-reassign */
  find(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    if ((opts || {}).rawCursor) {
      delete opts.rawCursor
      return this._dispatch(args =>
        Promise.resolve(args.col.find(args.query, args.options)),
      )({ options: opts, query, callback: fn }, 'find')
    }

    const promise = this._dispatch(args => {
      const cursor = args.col.find(args.query, args.options)

      if (!(opts || {}).stream && !promise.eachListener) {
        return cursor.toArray()
      }

      if (typeof (opts || {}).stream === 'function') {
        promise.eachListener = (opts || {}).stream
      }

      let didClose = false
      let didFinish = false
      let processing = 0

      function close() {
        didClose = true
        processing -= 1
        cursor.close()
      }

      function pause() {
        processing += 1
        cursor.pause()
      }

      return new Promise((resolve, reject) => {
        function done() {
          didFinish = true
          if (processing <= 0) {
            if (fn) {
              fn()
            }
            resolve()
          }
        }

        function resume() {
          processing -= 1
          cursor.resume()
          if (processing === 0 && didFinish) {
            done()
          }
        }

        cursor.on('data', doc => {
          if (!didClose) {
            promise.eachListener(doc, {
              close,
              pause,
              resume,
            })
          }
        })
        cursor.on('close', done)
        cursor.on('end', done)

        cursor.on('error', err => {
          if (fn) {
            fn(err)
          }
          reject(err)
        })
      })
    })({ options: opts, query, callback: fn }, 'find')

    promise.each = eachListener => {
      promise.eachListener = eachListener
      return promise
    }

    return promise
  }

  findOne(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(args =>
      args.col
        .find(args.query, args.options)
        .limit(1)
        .toArray()
        .then(docs => (docs && docs[0]) || null),
    )({ options: opts, query, callback: fn }, 'findOne')
  }

  findOneAndDelete(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(args =>
      args.col.findOneAndDelete(args.query, args.options).then(doc => {
        if (doc && typeof doc.value !== 'undefined') {
          return doc.value
        }
        if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
          return null
        }
        return doc
      }),
    )({ options: opts, query, callback: fn }, 'findOneAndDelete')
  }

  findOneAndUpdate(query, update, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(args => {
      if (typeof (args.options || {}).returnOriginal === 'undefined') {
        args.options.returnOriginal = false
      }
      return args.col
        .findOneAndUpdate(args.query, args.update, args.options)
        .then(doc => {
          if (doc && typeof doc.value !== 'undefined') {
            return doc.value
          }
          if (doc.ok && doc.lastErrorObject && doc.lastErrorObject.n === 0) {
            return null
          }
          return doc
        })
    })(
      {
        options: opts,
        query,
        update,
        callback: fn,
      },
      'findOneAndUpdate',
    )
  }

  geoHaystackSearch(x, y, opts, fn) {
    return this._dispatch(args =>
      args.col
        .geoHaystackSearch(args.x, args.y, args.options)
        .then(doc => (doc && doc.results) || doc),
    )(
      {
        x,
        y,
        options: opts,
        callback: fn,
      },
      'geoHaystackSearch',
    )
  }

  geoNear(x, y, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(args =>
      args.col
        .geoNear(args.x, args.y, args.options)
        .then(doc => (doc && doc.results) || doc),
    )(
      {
        x,
        y,
        options: opts,
        callback: fn,
      },
      'geoNear',
    )
  }

  group(keys, condition, initial, reduce, finalize, command, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(args =>
      args.col.group(
        args.keys,
        args.condition,
        args.initial,
        args.reduce,
        args.finalize,
        args.command,
        args.options,
      ),
    )(
      {
        options: opts,
        keys,
        condition,
        initial,
        reduce,
        finalize,
        command,
        callback: fn,
      },
      'group',
    )
  }

  indexes(fn) {
    return this._dispatch(args => args.col.indexInformation())(
      { callback: fn },
      'indexes',
    )
  }

  insert(data, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(args => {
      const arrayInsert = Array.isArray(args.data)

      if (arrayInsert && args.data.length === 0) {
        return Promise.resolve([])
      }
      return args.col.insert(args.data, args.options).then(docs => {
        let res = (docs || {}).ops
        if (res && !arrayInsert) {
          // eslint-disable-next-line prefer-destructuring
          res = docs.ops[0]
        }
        return res
      })
    })({ data, options: opts, callback: fn }, 'insert')
  }

  mapReduce(map, reduce, opts, fn) {
    return this._dispatch(args =>
      args.col.mapReduce(args.map, args.reduce, args.options),
    )(
      {
        map,
        reduce,
        options: opts,
        callback: fn,
      },
      'mapReduce',
    )
  }

  remove(query, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(args => {
      const options = args.options || {}
      const method =
        options.single || options.multi === false ? 'deleteOne' : 'deleteMany'
      return args.col[method](args.query, args.options)
    })(
      {
        query,
        options: opts,
        callback: fn,
      },
      'remove',
    )
  }

  stats(opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    return this._dispatch(args => args.col.stats(args.options))(
      {
        options: opts,
        callback: fn,
      },
      'stats',
    )
  }

  update(query, update, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }

    return this._dispatch(args => {
      const options = args.options || {}
      const method =
        options.multi || options.single === false ? 'updateMany' : 'updateOne'
      return args.col[method](args.query, args.update, args.options).then(
        doc => (doc && doc.result) || doc,
      )
    })(
      {
        update,
        query,
        options: opts,
        callback: fn,
      },
      'update',
    )
  }
  /* eslint-enable no-param-reassign */
}

module.exports = Collection

'use strict'

const { EventEmitter } = require('events')
const url = require('url')

const { MongoClient, ObjectID } = require('mongodb')
const Debug = require('debug')

const Collection = require('./collection')

const monkDebug = Debug('monkii:manager')

const STATE = {
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
}

const FIELDS_TO_CAST = ['operations', 'query', 'data', 'update']

const DEFAULT_OPTIONS = {
  castIds: true,
  middlewares: [
    /* eslint-disable global-require */
    require('monk-middleware-query'),
    require('monk-middleware-options'),
    require('monk-middleware-cast-ids')(FIELDS_TO_CAST),
    require('monk-middleware-fields'),
    require('monk-middleware-handle-callback'),
    require('monk-middleware-wait-for-connection'),
    /* eslint-enable global-require */
  ],
}

function normalizeURI(uri, opts) {
  /* eslint-disable no-param-reassign */
  if (Array.isArray(uri)) {
    if (!opts.database) {
      // eslint-disable-next-line no-plusplus
      for (let i = 0, l = uri.length; i < l; i++) {
        if (!opts.database) {
          opts.database = uri[i].replace(/([^/])+\/?/, '')
        }
        uri[i] = uri[i].replace(/\/.*/, '')
      }
    }
    uri = `${uri.join(',')}/${opts.database}`
    monkDebug('repl set connection "%j" to database "%s"', uri, opts.database)
  }
  /* eslint-enable no-param-reassign */

  if (typeof uri === 'string') {
    if (!/^mongodb:\/\//.test(uri)) {
      return `mongodb://${uri}`
    }
  }

  return uri
}

class Manager extends EventEmitter {
  constructor(uri, opts, fn) {
    super()

    /* eslint-disable no-param-reassign */
    if (typeof opts === 'function') {
      fn = opts
      opts = {}
    }
    opts = opts || {}
    /* eslint-enable no-param-reassign */

    if (!uri) {
      throw new Error('No connection URI provided.')
    }

    this._state = STATE.OPENING

    this._collectionOptions = Object.assign(
      {},
      DEFAULT_OPTIONS,
      opts.collectionOptions || {},
    )
    this._connectionURI = normalizeURI(uri, this._collectionOptions)
    this._dbURL = url.parse(this._connectionURI)
    this._dbName = this._dbURL.path.replace('/', '')

    this._queue = []
    this.on('open', db => {
      monkDebug('connection opened')
      monkDebug('emptying queries queue (%s to go)', this._queue.length)
      this._queue.forEach(cb => {
        cb(db)
      })
    })

    this.open(
      this._connectionURI,
      opts,
      fn &&
        (err => {
          fn(err, this)
        }),
    )

    this.helper = {
      id: ObjectID,
    }

    this.collections = {}

    this.collection = this.get
    this.col = this.get
    this.oid = this.id
  }

  open(uri, opts, fn) {
    MongoClient.connect(uri, opts, (err, client) => {
      const db = client && client.db(this._dbName)
      if (err || !db) {
        this._state = STATE.CLOSED
        this.emit('error-opening', err)
      } else {
        this._state = STATE.OPEN
        this._db = db
        this._dbClient = client

        // set up events
        ;[
          'close',
          'error',
          'fullsetup',
          'parseError',
          'reconnect',
          'timeout',
        ].forEach(eventName => {
          this._db.on(eventName, e => {
            this.emit(eventName, e)
          })
        })

        this.emit('open', db)
      }
      if (fn) {
        fn(err, this)
      }
    })
  }

  executeWhenOpened() {
    switch (this._state) {
      case STATE.OPEN:
        return Promise.resolve(this._db)
      case STATE.OPENING:
        return new Promise(resolve => {
          this._queue.push(resolve)
        })
      case STATE.CLOSED:
      default:
        return new Promise(resolve => {
          this._queue.push(resolve)
          this.open(this._connectionURI, this._connectionOptions)
        })
    }
  }

  then(fn) {
    return new Promise((resolve, reject) => {
      this.once('open', resolve)
      this.once('error-opening', reject)
    }).then(fn.bind(null, this))
  }

  catch(fn) {
    return new Promise(resolve => {
      this.once('error-opening', resolve)
    }).then(fn.bind(null))
  }

  close(force, fn) {
    if (typeof force === 'function') {
      /* eslint-disable no-param-reassign */
      fn = force
      force = false
      /* eslint-enable no-param-reassign */
    }

    const self = this
    function close(resolve, client) {
      client.close(force, () => {
        self._state = STATE.CLOSED
        if (fn) {
          fn()
        }
        resolve()
      })
    }

    switch (this._state) {
      case STATE.CLOSED:
        if (fn) {
          fn()
        }
        return Promise.resolve()
      case STATE.OPENING:
        return new Promise(resolve => {
          this._queue.push(db => {
            close(resolve, this._dbClient)
          })
        })
      case STATE.OPEN:
      default:
        return new Promise(resolve => {
          close(resolve, this._dbClient)
        })
    }
  }

  async listCollections(query) {
    const db = await this.executeWhenOpened()
    return db
      .listCollections(query)
      .toArray()
      .then(x => x.map(({ name }) => this.get(name)))
  }

  get(name, options) {
    if ((options || {}).cache === false || !this.collections[name]) {
      // eslint-disable-next-line no-param-reassign
      delete (options || {}).cache
      this.collections[name] = new Collection(
        this,
        name,
        Object.assign({}, this._collectionOptions || {}, options || {}),
      )
    }

    return this.collections[name]
  }

  create(name, creationOptions, options) {
    this.executeWhenOpened()
      .then(db => {
        db.createCollection(name, creationOptions)
      })
      .catch(err => {
        this.emit('error', err)
      })

    return this.get(name, options)
  }

  setDefaultCollectionOptions(options) {
    this._collectionOptions = options
  }

  addMiddleware(middleware) {
    if (!this._collectionOptions) {
      this._collectionOptions = {}
    }
    if (!this._collectionOptions.middlewares) {
      this._collectionOptions.middlewares = []
    }
    this._collectionOptions.middlewares.push(middleware)
  }

  // eslint-disable-next-line global-require
  id(str) {
    return require('./helpers').id(str)
  }

  // eslint-disable-next-line global-require
  cast(obj) {
    return require('./helpers').cast(obj)
  }
}

module.exports = Manager

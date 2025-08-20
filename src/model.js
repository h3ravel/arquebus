import { compose, flattenDeep, getRelationMethod, getScopeMethod, snakeCase, tap } from './utils'

import BelongsTo from './relations/belongs-to'
import BelongsToMany from './relations/belongs-to-many'
import Builder from './builder'
import Collection from './collection'
import HasAttributes from './concerns/has-attributes'
import HasGlobalScopes from './concerns/has-global-scopes'
import HasHooks from './concerns/has-hooks'
import HasMany from './relations/has-many'
import HasOne from './relations/has-one'
import HasRelations from './concerns/has-relations'
import HasTimestamps from './concerns/has-timestamps'
import HidesAttributes from './concerns/hides-attributes'
import UniqueIds from './concerns/unique-ids'
import arquebus from './arquebus'
import collect from 'collect.js'
import { assign as merge } from 'radashi'
import pluralize from 'pluralize'

const BaseModel = compose(class {
}, HasAttributes, HidesAttributes, HasRelations, HasTimestamps, HasHooks, HasGlobalScopes, UniqueIds)
export class Model extends BaseModel {
  primaryKey = 'id' // protected
  builder = null // protected
  table = null // protected
  connection = null // protected
  keyType = 'int' // protected
  incrementing = true // protected
  perPage = 15 // protected
  exists = false
  eagerLoad = {}
  with = []
  withCount = [] // protected
  trx = null
  static globalScopes = {}
  static pluginInitializers = {}
  static _booted = {}
  static resolver = null
  static query (trx = null) {
    const instance = new this()
    return instance.newQuery(trx)
  }
  static on (connection = null) {
    const instance = new this
    instance.setConnection(connection)
    return instance.newQuery()
  }
  static init (attributes = {}) {
    return new this(attributes)
  }
  static extend (plugin, options) {
    plugin(this, options)
  }
  static make (attributes = {}) {
    const instance = new this()
    for (let attribute in attributes) {
      if (typeof instance[getRelationMethod(attribute)] !== 'function') {
        instance.setAttribute(attribute, attributes[attribute])
      }
      else {
        const relation = instance[getRelationMethod(attribute)]()
        const related = relation.getRelated().constructor
        if (relation instanceof HasOne
          || relation instanceof BelongsTo) {
          instance.setRelation(attribute, related.make(attributes[attribute]))
        }
        else if ((relation instanceof HasMany || relation instanceof BelongsToMany)
          && Array.isArray(attributes[attribute])) {
          instance.setRelation(attribute, new Collection(attributes[attribute].map(item => related.make(item))))
        }
      }
    }
    return instance
  }
  constructor(attributes = {}) {
    super()
    this.bootIfNotBooted()
    this.initializePlugins()
    this.syncOriginal()
    this.fill(attributes)
    return this.asProxy()
  }
  bootIfNotBooted () {
    if (this.constructor._booted[this.constructor.name] === undefined) {
      this.constructor._booted[this.constructor.name] = true
      this.constructor.booting()
      this.initialize()
      this.constructor.boot()
      this.constructor.booted()
    }
  }
  static booting () {
  }
  static boot () {
  }
  static booted () {
  }
  static setConnectionResolver (resolver) {
    this.resolver = resolver
  }
  initialize () {
  }
  initializePlugins () {
    if (typeof this.constructor.pluginInitializers[this.constructor.name] === 'undefined') {
      return
    }
    for (const method of this.constructor.pluginInitializers[this.constructor.name]) {
      this[method]()
    }
  }
  addPluginInitializer (method) {
    if (!this.constructor.pluginInitializers[this.constructor.name]) {
      this.constructor.pluginInitializers[this.constructor.name] = []
    }
    this.constructor.pluginInitializers[this.constructor.name].push(method)
  }
  newInstance (attributes = {}, exists = false) {
    const model = new this.constructor
    model.exists = exists
    model.setConnection(this.getConnectionName())
    model.setTable(this.getTable())
    model.fill(attributes)
    return model
  }
  newFromBuilder (attributes = {}, connection = null) {
    const model = this.newInstance({}, true)
    model.setRawAttributes(attributes, true)
    model.setConnection(connection || this.getConnectionName())
    return model
  }
  asProxy () {
    const handler = {
      get: function (target, prop) {
        if (target[prop] !== undefined) {
          return target[prop]
        }
        // get model column
        if (typeof prop === 'string') {
          // get custom attribute
          return target.getAttribute(prop)
        }
      },
      set: function (target, prop, value) {
        if (target[prop] !== undefined && typeof target !== 'function') {
          target[prop] = value
          return target
        }
        if (typeof prop === 'string') {
          return target.setAttribute(prop, value)
        }
        return target
      }
    }
    return new Proxy(this, handler)
  }
  getKey () {
    return this.getAttribute(this.getKeyName())
  }
  getKeyName () {
    return this.primaryKey
  }
  getForeignKey () {
    return snakeCase(this.constructor.name) + '_' + this.getKeyName()
  }
  getConnectionName () {
    return this.connection
  }
  getTable () {
    return this.table || pluralize(snakeCase(this.constructor.name))
  }
  getConnection () {
    if (this.constructor.resolver) {
      return this.constructor.resolver.getConnection(this.connection)
    }
    return arquebus.connection(this.connection)
  }
  setConnection (connection) {
    this.connection = connection
    return this
  }
  getKeyType () {
    return this.keyType
  }
  newQuery (trx = null) {
    return this.addGlobalScopes(this.newQueryWithoutScopes(trx))
  }
  newQueryWithoutScopes (trx = null) {
    return this.newModelQuery(trx)
      .with(this.with)
      .withCount(this.withCount)
  }
  newModelQuery (trx = null) {
    const builder = new Builder(trx || this.getConnection())
    return builder.setModel(this)
  }
  addGlobalScopes (builder) {
    const globalScopes = this.getGlobalScopes()
    for (const identifier in globalScopes) {
      const scope = globalScopes[identifier]
      builder.withGlobalScope(identifier, scope)
    }
    return builder
  }
  hasNamedScope (name) {
    const scope = getScopeMethod(name)
    return typeof this[scope] === 'function'
  }
  callNamedScope (scope, parameters) {
    const scopeMethod = getScopeMethod(scope)
    return this[scopeMethod](...parameters)
  }
  setTable (table) {
    this.table = table
    return this
  }
  newCollection (models = []) {
    return new Collection(models)
  }
  async load (...relations) {
    const query = this.constructor.query().with(...relations)
    await query.eagerLoadRelations([this])
    return this
  }
  async loadAggregate (relations, column, callback = null) {
    await new Collection([this]).loadAggregate(relations, column, callback)
    return this
  }
  async loadCount (...relations) {
    relations = flattenDeep(relations)
    return await this.loadAggregate(relations, '*', 'count')
  }
  async loadMax (relations, column) {
    return await this.loadAggregate(relations, column, 'max')
  }
  async loadMin (relations, column) {
    return await this.loadAggregate(relations, column, 'min')
  }
  async loadSum (relations, column) {
    return await this.loadAggregate(relations, column, 'sum')
  }
  async increment (column, amount = 1, extra = {}, options = {}) {
    return await this.incrementOrDecrement(column, amount, extra, 'increment', options)
  }
  async decrement (column, amount = 1, extra = {}, options = {}) {
    return await this.incrementOrDecrement(column, amount, extra, 'decrement', options)
  }
  async incrementOrDecrement (column, amount, extra, method, options) {
    const query = this.newModelQuery(options.client)
    if (!this.exists) {
      return await query[method](column, amount, extra)
    }
    this.attributes[column] = this[column] + (method === 'increment' ? amount : amount * -1)
    for (let key in extra) {
      this.attributes[key] = extra[key]
    }
    await this.execHooks('updating', options)
    return await tap(await query.where(this.getKeyName(), this.getKey())[method](column, amount, extra), async () => {
      this.syncChanges()
      await this.execHooks('updated', options)
      this.syncOriginalAttribute(column)
    })
  }
  toData () {
    return merge(this.attributesToData(), this.relationsToData())
  }
  toJSON () {
    return this.toData()
  }
  toJson (...args) {
    return JSON.stringify(this.toData(), ...args)
  }
  toString () {
    return this.toJson()
  }
  fill (attributes) {
    for (const key in attributes) {
      this.setAttribute(key, attributes[key])
    }
    return this
  }
  transacting (trx) {
    this.trx = trx
    return this
  }
  trashed () {
    return this[this.getDeletedAtColumn()] !== null
  }
  getIncrementing () {
    return this.incrementing
  }
  setIncrementing (value) {
    this.incrementing = value
    return this
  }
  async save (options = {}) {
    // const query = this.newQuery(options.client).setModel(this);
    const query = this.newModelQuery(options.client)
    let saved
    await this.execHooks('saving', options)
    if (this.exists) {
      if (this.isDirty() === false) {
        saved = true
      }
      else {
        await this.execHooks('updating', options)
        if (this.usesTimestamps()) {
          this.updateTimestamps()
        }
        const dirty = this.getDirty()
        if (Object.keys(dirty).length > 0) {
          await query.where(this.getKeyName(), this.getKey()).query.update(dirty)
          this.syncChanges()
          await this.execHooks('updated', options)
        }
        saved = true
      }
    }
    else {
      if (this.usesUniqueIds()) {
        this.setUniqueIds()
      }
      await this.execHooks('creating', options)
      if (this.usesTimestamps()) {
        this.updateTimestamps()
      }
      const attributes = this.getAttributes()
      if (this.getIncrementing()) {
        const keyName = this.getKeyName()
        const data = await query.insert([attributes], [keyName])
        this.setAttribute(keyName, data[0]?.[keyName] || data[0])
      }
      else {
        if (Object.keys(attributes).length > 0) {
          await query.insert(attributes)
        }
      }
      this.exists = true
      await this.execHooks('created', options)
      saved = true
    }
    if (saved) {
      await this.execHooks('saved', options)
      this.syncOriginal()
    }
    return saved
  }
  async update (attributes = {}, options = {}) {
    if (!this.exists) {
      return false
    }
    for (let key in attributes) {
      this[key] = attributes[key]
    }
    return await this.save(options)
  }
  async delete (options = {}) {
    await this.execHooks('deleting', options)
    await this.performDeleteOnModel(options)
    await this.execHooks('deleted', options)
    return true
  }
  async performDeleteOnModel (options = {}) {
    await this.setKeysForSaveQuery(this.newModelQuery(options.client)).delete()
    this.exists = false
  }
  setKeysForSaveQuery (query) {
    query.where(this.getKeyName(), '=', this.getKey())
    return query
  }
  async forceDelete (options = {}) {
    return await this.delete(options)
  }
  fresh () {
    if (!this.exists) {
      return
    }
    return this.constructor.query().where(this.getKeyName(), this.getKey()).first()
  }
  async refresh () {
    if (!this.exists) {
      return
    }
    const model = await this.constructor.query().where(this.getKeyName(), this.getKey()).first()
    this.attributes = { ...model.attributes }
    await this.load(collect(this.relations).reject((relation) => {
      return relation instanceof Pivot
    }).keys().all())
    this.syncOriginal()
    return this
  }
  newPivot (parent, attributes, table, exists, using = null) {
    return using ? using.fromRawAttributes(parent, attributes, table, exists)
      : Pivot.fromAttributes(parent, attributes, table, exists)
  }
  qualifyColumn (column) {
    if (column.includes('.')) {
      return column
    }
    return `${this.getTable()}.${column}`
  }
  getQualifiedKeyName () {
    return this.qualifyColumn(this.getKeyName())
  }
  async push (options = {}) {
    const saved = await this.save(options)
    if (!saved) {
      return false
    }
    for (const relation in this.relations) {
      let models = this.relations[relation]
      models = models instanceof Collection ? models.all() : [models]
      for (const model of models) {
        if (!await model.push(options)) {
          return false
        }
      }
      ;
    }
    return true
  }
  is (model) {
    return model && model instanceof Model &&
      this.getKey() === model.getKey() &&
      this.getTable() === model.getTable() &&
      this.getConnectionName() === model.getConnectionName()
  }
  isNot (model) {
    return !this.is(model)
  }
}

export class Pivot extends Model {
  incrementing = false
  guarded = []
  pivotParent = null
  foreignKey = null
  relatedKey = null
  setPivotKeys (foreignKey, relatedKey) {
    this.foreignKey = foreignKey
    this.relatedKey = relatedKey
    return this
  }
  static fromRawAttributes (parent, attributes, table, exists = false) {
    const instance = this.fromAttributes(parent, {}, table, exists)
    instance.timestamps = instance.hasTimestampAttributes(attributes)
    instance.attributes = attributes
    instance.exists = exists
    return instance
  }
  static fromAttributes (parent, attributes, table, exists = false) {
    const instance = new this
    instance.timestamps = instance.hasTimestampAttributes(attributes)
    instance.setConnection(parent.connection)
      .setTable(table)
      .fill(attributes)
      .syncOriginal()
    instance.pivotParent = parent
    instance.exists = exists
    return instance
  }
  hasTimestampAttributes (attributes = null) {
    return (attributes || this.attributes)[this.constructor.CREATED_AT] !== undefined
  }
}

export default Model

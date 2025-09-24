import type { TFunction, TGeneric } from 'types/generics'
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
import type { IBuilder } from 'types/builder'
import type { IModel } from 'types/modeling'
// import type { IModel } from 'types/modeling'
import type { TBaseConfig } from 'types/container'
import UniqueIds from './concerns/unique-ids'
import type { WithRelationType } from 'types/query-methods'
import arquebus from './arquebus'
import collect from 'collect.js'
import { assign as merge } from 'radashi'
import pluralize from 'pluralize'

const ModelClass = class { } as { new(): IModel } & IModel

const BaseModel = compose<typeof ModelClass>(
  ModelClass,
  HasAttributes,
  HidesAttributes,
  HasRelations,
  HasTimestamps,
  HasHooks,
  HasGlobalScopes,
  UniqueIds
)

// @ts-expect-error Errors will come from overlapping mixing methods and properties
export class Model extends BaseModel {
  protected builder: IBuilder<any, any> | null = null
  protected table: string | null = null
  protected keyType = 'int'
  protected incrementing = true
  protected withCount = [] // protected
  protected primaryKey = 'id'
  public perPage = 15
  static globalScopes = {}
  static pluginInitializers = {}
  static _booted = {}
  static resolver: arquebus
  public connection: TBaseConfig['client'] | null = null
  eagerLoad = {}
  exists: boolean = false
  with: string | string[] | TGeneric<(...args: any[]) => IBuilder<Model>> = []
  trx = null

  constructor(attributes = {}) {
    super()
    this.bootIfNotBooted()
    this.initializePlugins()
    this.syncOriginal()
    this.fill(attributes)
    return this.asProxy()
  }

  static query (trx = null) {
    const instance = new this()
    return instance.newQuery(trx)
  }
  static on (connection: TBaseConfig['client'] | null = null) {
    const instance = new this
    instance.setConnection(connection)
    return instance.newQuery()
  }
  static init (attributes = {}) {
    return new this(attributes)
  }
  static extend (plugin: TFunction, options: TGeneric) {
    plugin(this, options)
  }
  static make (attributes: TGeneric = {}) {
    const instance = new this()
    for (const attribute in attributes) {
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

  getConstructor<T extends typeof Model> (this: InstanceType<T>) {
    return this.constructor as T
  }

  bootIfNotBooted (this: any) {
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
  static setConnectionResolver (resolver: arquebus) {
    this.resolver = resolver
  }
  initialize () {
  }
  initializePlugins (this: any) {
    if (typeof this.constructor.pluginInitializers[this.constructor.name] === 'undefined') {
      return
    }
    for (const method of this.constructor.pluginInitializers[this.constructor.name]) {
      this[method]()
    }
  }
  addPluginInitializer (this: any, method: any) {
    if (!this.constructor.pluginInitializers[this.constructor.name]) {
      this.constructor.pluginInitializers[this.constructor.name] = []
    }
    this.constructor.pluginInitializers[this.constructor.name].push(method)
  }
  newInstance (this: any, attributes: TGeneric = {}, exists = false) {
    const model = new this.constructor
    model.exists = exists
    model.setConnection(this.getConnectionName())
    model.setTable(this.getTable())
    model.fill(attributes)
    return model
  }
  newFromBuilder (attributes: TGeneric = {}, connection = null) {
    const model = this.newInstance({}, true)
    model.setRawAttributes(attributes, true)
    model.setConnection(connection || this.getConnectionName())
    return model
  }
  asProxy () {
    const handler = {
      get: function (target: Model, prop: keyof Model) {
        if (target[prop] !== undefined) {
          return target[prop]
        }
        // get model column
        if (typeof prop === 'string') {
          // get custom attribute
          return target.getAttribute(prop)
        }
      },
      set: function (target: Model, prop: keyof Model, value: string) {
        if (target[prop] !== undefined && typeof target !== 'function') {
          target[prop] = value
          return target
        }
        if (typeof prop === 'string') {
          return target.setAttribute(prop, value)
        }
        return target
      }
    } as any

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
    return this.connection!
  }
  getTable () {
    return this.table || pluralize(snakeCase(this.constructor.name))
  }
  getConnection (this: any) {
    if (this.constructor.resolver) {
      return this.constructor.resolver.getConnection(this.connection)
    }
    return arquebus.fire(this.connection)
  }
  setConnection (connection: TBaseConfig['client'] | null) {
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
  addGlobalScopes (this: any, builder: Builder<Model>) {
    const globalScopes = this.getGlobalScopes()
    for (const identifier in globalScopes) {
      const scope = globalScopes[identifier]
      builder.withGlobalScope(identifier, scope)
    }
    return builder
  }
  hasNamedScope (name: string) {
    const scope = getScopeMethod(name)
    return typeof this[scope] === 'function'
  }
  callNamedScope (scope: string, parameters: any[]) {
    const scopeMethod = getScopeMethod(scope)
    return this[scopeMethod](...parameters)
  }
  setTable (table: string) {
    this.table = table
    return this
  }
  newCollection (this: any, models = []) {
    return new Collection<Model>(models)
  }
  async load<R extends WithRelationType> (this: any, ...relations: R[]) {
    const query = this.constructor.query().with(...relations)
    await query.eagerLoadRelations([this])
    return this
  }
  async loadAggregate<R extends WithRelationType> (relations: R[], column: string, callback: TFunction | string | null = null) {
    console.log(relations)
    await new Collection([this]).loadAggregate(relations, column, callback)
    return this
  }
  async loadCount<R extends WithRelationType> (...relations: R[]) {
    relations = flattenDeep(relations)
    return await this.loadAggregate(relations, '*', 'count')
  }
  async loadMax<R extends WithRelationType> (relations: R[], column: string) {
    return await this.loadAggregate(relations, column, 'max')
  }
  async loadMin<R extends WithRelationType> (relations: R[], column: string) {
    return await this.loadAggregate(relations, column, 'min')
  }
  async loadSum<R extends WithRelationType> (relations: R[], column: string) {
    return await this.loadAggregate(relations, column, 'sum')
  }
  async increment (column: string, amount: number = 1, extra: TGeneric = {}, options: TGeneric = {}) {
    return await this.incrementOrDecrement(column, amount, extra, 'increment', options)
  }
  async decrement (column: string, amount: number = 1, extra: TGeneric = {}, options: TGeneric = {}) {
    return await this.incrementOrDecrement(column, amount, extra, 'decrement', options)
  }

  async incrementOrDecrement (column: string, amount: number, extra: TGeneric, method: string, options: TGeneric) {
    const query = this.newModelQuery(options.client) as any
    if (!this.exists) {
      return await query[method](column, amount, extra)
    }
    this.attributes[column] = this[column] + (method === 'increment' ? amount : amount * -1)
    for (const key in extra) {
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
  toJson (...args: any[]) {
    return JSON.stringify(this.toData(), ...args)
  }
  toString () {
    return this.toJson()
  }
  fill (attributes: TGeneric) {
    for (const key in attributes) {
      this.setAttribute(key, attributes[key])
    }
    return this
  }
  transacting (trx: any) {
    this.trx = trx
    return this
  }
  trashed () {
    return this[this.getDeletedAtColumn()] !== null
  }
  getIncrementing () {
    return this.incrementing
  }
  setIncrementing (value: boolean) {
    this.incrementing = value
    return this
  }
  async save (options: TGeneric = {}) {
    // const query = this.newQuery(options.client).setModel(this)
    const query = this.newModelQuery(options.client)
    let saved: boolean

    await this.execHooks('saving', options)

    if (this.exists) {
      if (this.isDirty() === false) {
        saved = true
      } else {
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
    } else {
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
        /////////
        const data = await query.insert([attributes], [keyName])
        this.setAttribute(keyName, data[0]?.[keyName] || data[0])
      } else {
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
  async update (attributes: TGeneric = {}, options: TGeneric = {}) {
    if (!this.exists) {
      return false
    }
    for (const key in attributes) {
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
  async performDeleteOnModel (options: TGeneric = {}) {
    await this.setKeysForSaveQuery(this.newModelQuery(options.client)).delete()
    this.exists = false
  }
  setKeysForSaveQuery (query: any) {
    query.where(this.getKeyName(), '=', this.getKey())
    return query
  }

  async forceDelete (options = {}) {
    return await this.delete(options)
  }

  fresh (this: any) {
    if (!this.exists) {
      return
    }
    return this.constructor.query().where(this.getKeyName(), this.getKey()).first()
  }

  async refresh (this: any) {
    if (!this.exists) {
      return Promise.resolve(undefined)
    }
    const model = await this.constructor.query().where(this.getKeyName(), this.getKey()).first()
    this.attributes = { ...model.attributes }
    await this.load(collect(this.relations).reject((relation) => {
      return relation instanceof Pivot
    }).keys().all())
    this.syncOriginal()
    return this
  }

  newPivot<E extends Model> (parent: E, attributes: TGeneric, table: string, exists: boolean, using: typeof Pivot | null = null) {
    return using ? using.fromRawAttributes(parent, attributes, table, exists)
      : Pivot.fromAttributes(parent, attributes, table, exists)
  }

  qualifyColumn (column: string) {
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

  is (model: any) {
    return model && model instanceof Model &&
      this.getKey() === model.getKey() &&
      this.getTable() === model.getTable() &&
      this.getConnectionName() === model.getConnectionName()
  }

  isNot (model: any) {
    return !this.is(model)
  }
}

export class Pivot extends Model {
  incrementing = false
  guarded = []
  pivotParent: Model | null = null
  foreignKey: string | null = null
  relatedKey: string | null = null
  setPivotKeys (foreignKey: string, relatedKey: string) {
    this.foreignKey = foreignKey
    this.relatedKey = relatedKey
    return this
  }
  static fromRawAttributes<E extends Model> (parent: E, attributes: TGeneric, table: string, exists = false) {
    const instance = this.fromAttributes(parent, {}, table, exists)
    instance.timestamps = instance.hasTimestampAttributes(attributes)
    instance.attributes = attributes
    instance.exists = exists
    return instance
  }

  static fromAttributes<E extends Model> (parent: E, attributes: TGeneric, table: string, exists = false) {
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

  hasTimestampAttributes (this: any, attributes: TGeneric | null = null) {
    return (attributes || this.attributes)[this.constructor.CREATED_AT] !== undefined
  }
}

export default Model

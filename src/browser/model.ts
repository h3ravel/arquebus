import type { TFunction, TGeneric } from 'types/generics'
import { compose, getRelationMethod, getScopeMethod, snakeCase } from '../utils'

import BelongsTo from './relations/belongs-to'
import BelongsToMany from './relations/belongs-to-many'
import Collection from './collection'
import HasAttributes from '../concerns/has-attributes'
import HasMany from './relations/has-many'
import HasOne from './relations/has-one'
import HasRelations from './concerns/has-relations'
import HasTimestamps from '../concerns/has-timestamps'
import HidesAttributes from '../concerns/hides-attributes'
import type { TBaseConfig } from 'types/container'
import type arquebus from '../arquebus'
import { assign as merge } from 'radashi'
import pluralize from 'pluralize'

const BaseModel = compose<any, any>(
  class { },
  HasAttributes,
  HidesAttributes,
  HasRelations,
  HasTimestamps,
)

class Model extends BaseModel {
  protected primaryKey = 'id'
  protected perPage = 15
  static globalScopes = {}
  static pluginInitializers = {}
  static _booted = {}
  static resolver: arquebus
  static browser = true
  public connection: TBaseConfig['client'] | null = null

  constructor(attributes = {}) {
    super()
    this.bootIfNotBooted()
    this.initializePlugins()
    this.syncOriginal()
    this.fill(attributes)

    this.buildRelationships(attributes)

    return this.asProxy()
  }

  static init (attributes = {}) {
    return new this(attributes)
  }

  static extend (plugin: TFunction, options: TGeneric) {
    plugin(this, options)
  }


  static make (attributes: TGeneric = {}) {
    const instance = new this()

    instance.buildRelationships(attributes)

    return instance
  }

  buildRelationships (attributes: TGeneric = {}) {
    for (const attribute in attributes) {
      if (typeof this[getRelationMethod(attribute)] !== 'function') {
        this.setAttribute(attribute, attributes[attribute])
      } else {
        const relation = this[getRelationMethod(attribute)]()
        if (relation instanceof HasOne || relation instanceof BelongsTo) {
          this.setRelation(
            attribute,
            relation.related.make(attributes[attribute]),
          )
        } else if (
          (relation instanceof HasMany || relation instanceof BelongsToMany) &&
          Array.isArray(attributes[attribute])
        ) {
          this.setRelation(
            attribute,
            new Collection(
              attributes[attribute].map((item) => relation.related.make(item)),
            ),
          )
        }
      }
    }
  }

  bootIfNotBooted (this: any) {
    if (this.constructor._booted[this.constructor.name] == null) {
      this.constructor._booted[this.constructor.name] = true
      this.constructor.booting()
      this.initialize()
      this.constructor.boot()
      this.constructor.booted()
    }
  }
  static booting () { }
  static boot () { }
  static booted () { }
  static setConnectionResolver (resolver: arquebus) {
    this.resolver = resolver
  }
  initialize () { }
  initializePlugins (this: any) {
    if (
      typeof this.constructor.pluginInitializers[this.constructor.name] ===
      'undefined'
    ) {
      return null
    }
    for (const method of this.constructor.pluginInitializers[
      this.constructor.name
    ]) {
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
    const model = new this.constructor()
    model.exists = exists
    model.setTable(this.getTable())
    model.fill(attributes)
    return model
  }

  asProxy () {
    const handler = {
      get: function (target: Model, prop: keyof Model) {
        if (target[prop] != null) {
          return target[prop]
        }
        // get model column
        if (typeof prop === 'string') {
          // get custom attribute
          return target.getAttribute(prop)
        }
      },
      set: function (target: Model, prop: keyof Model, value: string) {
        if (target[prop] != null && typeof target !== 'function') {
          target[prop] = value
          return target
        }
        if (typeof prop === 'string') {
          return target.setAttribute(prop, value)
        }
        return target
      },
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
    return this.connection
  }
  getTable () {
    return this.table || pluralize(snakeCase(this.constructor.name))
  }
  setConnection (connection: TBaseConfig['client']) {
    this.connection = connection
    return this
  }
  getKeyType () {
    return this.keyType
  }
  hasNamedScope (name: string) {
    const scope = getScopeMethod(name)
    return typeof this[scope] === 'function'
  }
  callNamedScope (scope: string, parameters: any) {
    const scopeMethod = getScopeMethod(scope)
    return this[scopeMethod](...parameters)
  }
  setTable (table: string) {
    this.table = table
    return this
  }
  newCollection (models = []) {
    return new Collection(models)
  }
  getIncrementing () {
    return this.incrementing
  }
  setIncrementing (value: boolean) {
    this.incrementing = value
    return this
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

  newPivot<E extends Model> (
    parent: E,
    attributes: TGeneric,
    table: string,
    exists: boolean,
    using: typeof Pivot | null = null,
  ) {
    return using
      ? using.fromRawAttributes(parent, attributes, table, exists)
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

  is (model: any) {
    return (
      model &&
      model instanceof Model &&
      this.getKey() === model.getKey() &&
      this.getTable() === model.getTable()
    )
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

  static fromRawAttributes<E extends Model> (
    parent: E,
    attributes: TGeneric,
    table: string,
    exists = false,
  ) {
    const instance = this.fromAttributes(parent, {}, table, exists)
    instance.timestamps = instance.hasTimestampAttributes(attributes)
    instance.attributes = attributes
    instance.exists = exists
    return instance
  }

  static fromAttributes<E extends Model> (
    parent: E,
    attributes: TGeneric,
    table: string,
    exists = false,
  ) {
    const instance = new this()
    instance.timestamps = instance.hasTimestampAttributes(attributes)
    instance
      .setConnection(parent.connection!)
      .setTable(table)
      .fill(attributes)
      .syncOriginal()
    instance.pivotParent = parent
    instance.exists = exists
    return instance
  }

  hasTimestampAttributes (this: any, attributes: TGeneric | null = null) {
    return (
      (attributes || this.attributes)[this.constructor.CREATED_AT] != null
    )
  }
}

export default Model

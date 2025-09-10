import { compose, getAttrMethod, getRelationMethod, getScopeMethod } from './utils'

import Attribute from './casts/attribute'
import Knex from 'knex'
import { Model } from './model'
import QueryBuilder from './query-builder'
import type { ModelOptions, TBaseConfig, TConfig } from 'types/container'
import type { TFunction, TGeneric } from 'types/generics'
import path from 'path'
import { existsSync } from 'fs'

class arquebus<M extends Model = Model> {
  static connectorFactory: typeof Knex | null = null
  static instance: arquebus | null = null
  public manager: Record<string, QueryBuilder<M>>
  public connections: Record<string, TConfig>
  public models: Record<string, typeof Model>

  constructor() {
    this.manager = {}
    this.connections = {}
    this.models = {}
  }

  getConstructor<T extends typeof arquebus> (this: InstanceType<T>) {
    return this.constructor as T
  }

  static getInstance () {
    if (this.instance === null) {
      this.instance = new arquebus()
    }
    return this.instance
  }

  /**
   * Initialize a new database connection 
   * 
   * @returns 
   */
  static fire<C extends TBaseConfig['client']> (connection: C | null = null): QueryBuilder<Model> {
    return this.getInstance().getConnection(connection)
  }

  /**
   * Initialize a new database connection 
   * 
   * This is an alias of `arquebus.fire()` and will be removed in the future
   * 
   * @deprecated since version 0.3.0
   * @alias fire
   * 
   * @returns 
   */
  static connection<C extends TBaseConfig['client']> (connection: C | null = null) {
    return this.fire(connection)
  }

  static setConnectorFactory (connectorFactory: typeof Knex) {
    this.connectorFactory = connectorFactory
  }

  static getConnectorFactory () {
    return this.connectorFactory ?? Knex
  }

  static addConnection (config: TConfig | TBaseConfig, name: string = 'default') {
    return this.getInstance().addConnection(config, name)
  }

  static beginTransaction (connection = null) {
    return this.getInstance().beginTransaction(connection)
  }

  static transaction (callback: TFunction, connection = null) {
    return this.getInstance().transaction(callback, connection)
  }

  static table (name: string, connection = null) {
    return this.getInstance().table(name, connection)
  }

  static schema (connection = null) {
    return this.getInstance().schema(connection)
  }

  static async destroyAll () {
    await this.getInstance().destroyAll()
  }

  static createModel<X extends TGeneric> (name: string, options: X) {
    return this.getInstance().createModel(name, options)
  }

  connection (connection: string | null = null) {
    return this.getConnection(connection)
  }
  getConnection (name: string | null = null) {
    name = name || 'default'

    if (this.manager[name] === undefined) {
      const queryBuilder = new QueryBuilder(this.connections[name], arquebus.getConnectorFactory());
      (this.manager as any)[name] = queryBuilder
    }
    return this.manager[name]
  }

  addConnection (config: TConfig | TBaseConfig, name: string = 'default') {
    this.connections[name] = <TConfig>{
      ...config,
      connection: {
        ...config.connection,
        dateStrings: true,
        typeCast: function (field, next) {
          if (field.type === 'JSON') {
            return field.string('utf8')
          }
          return next()
        }
      }
    }
  }

  /**
   * Autoload the config file
   * 
   * @param addConnection 
   * @default true
   * If set to `false` we will no attempt add the connection, we 
   * will just go ahead and return the config
   * 
   * @returns 
   */
  static async autoLoad (addConnection: boolean = true): Promise<TBaseConfig> {
    let config: TBaseConfig
    const jsPath = path.resolve('arquebus.config.js')
    const tsPath = path.resolve('arquebus.config.ts')
    const instance = this.getInstance()

    if (existsSync(jsPath)) {
      config = (await import(jsPath)).default
      if (addConnection) instance.addConnection(config, config.client)
      return config
    }

    if (existsSync(tsPath)) {
      if (process.env.NODE_ENV !== 'production') {
        config = (await import(tsPath)).default
        if (addConnection) instance.addConnection(config, config.client)
        return config
      } else {
        throw new Error('arquebus.config.ts found in production without build step')
      }
    }

    return {} as TBaseConfig
  }

  beginTransaction (connection = null) {
    return this.connection(connection).beginTransaction()
  }

  transaction (callback: TFunction, connection = null) {
    return this.connection(connection).transaction(callback)
  }

  table (name: string, connection = null) {
    return this.connection(connection).table(name)
  }

  schema (connection = null) {
    return this.connection(connection).schema
  }

  async destroyAll () {
    await Promise.all(Object.values(this.manager).map((connection) => {
      return connection?.destroy()
    }))
  }

  createModel (name: string, options: ModelOptions = {}) {
    let BaseModel = Model
    if ('plugins' in options) {
      BaseModel = compose(BaseModel, ...(options.plugins ?? [])) as typeof BaseModel
    }

    this.models = <Model>{
      ...this.models,
      [name]: class extends BaseModel {
        table = options?.table ?? null
        connection = options?.connection ?? null
        timestamps = options?.timestamps ?? true
        primaryKey = options?.primaryKey ?? 'id'
        keyType = options?.keyType ?? 'int'
        incrementing = options?.incrementing ?? true
        with = options?.with ?? []
        casts = options?.casts ?? {}
        static CREATED_AT = options?.CREATED_AT ?? 'created_at'
        static UPDATED_AT = options?.UPDATED_AT ?? 'updated_at'
        static DELETED_AT = options?.DELETED_AT ?? 'deleted_at'
      }
    }

    if ('attributes' in options) {
      for (const attribute in options.attributes) {
        if (options.attributes[attribute] instanceof Attribute === false) {
          throw new Error('Attribute must be an instance of "Attribute"')
        }
        this.models[name].prototype[getAttrMethod(attribute)] = () => options.attributes?.[attribute]
      }
    }

    if ('relations' in options) {
      for (const relation in options.relations) {
        this.models[name].prototype[getRelationMethod(relation)] = function () {
          return options.relations?.[relation](this)
        }
      }
    }

    if ('scopes' in options) {
      for (const scope in options.scopes) {
        this.models[name].prototype[getScopeMethod(scope)] = options.scopes[scope]
      }
    }
    this.models[name].setConnectionResolver(this as any)
    return this.models[name]
  }
}
const isBrowser = false
export { isBrowser }
export default arquebus

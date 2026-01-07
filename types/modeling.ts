import type { AnyQueryBuilder, WithRelationType } from './query-methods'
import type {
  Hook,
  RelationNames,
  ReturnTypeOfMethod,
  SnakeToCamelCase,
  TFunction,
  TGeneric,
} from './generics'

import type { IBuilder } from './builder'
import type { ICollection } from './utils'
import type Model from 'src/model'
import type { TBaseConfig } from './container'

export interface Attribute {
  make (config: { get?: TFunction | null; set?: TFunction | null }): Attribute
  get: TFunction | null
  set: TFunction | null
  withCaching?: boolean
  withObjectCaching?: boolean
}

export interface CastsAttributes {
  get (): any
  set (): void
}

export type Relation<M extends Model> = IBuilder<M, any> & {}

export interface HasOneOrMany<M extends Model> extends Relation<M> {
  save (model: M): Promise<M>
  saveMany (models: M[] | ICollection<M>): Promise<ICollection<M>>
  create (attributes?: any): Promise<M>
  createMany (records: any[]): Promise<ICollection<M>>
}

export interface HasOne<M extends Model> extends HasOneOrMany<M> {
  getResults (): Promise<M | null>
  withDefault (callback?: TFunction | object): this
}

export interface HasMany<M extends Model> extends HasOneOrMany<M> {
  getResults (): Promise<ICollection<M>>
}

export interface BelongsTo<M extends Model> extends Relation<M> {
  getResults (): Promise<M | null>
  withDefault (callback?: TFunction | object): this
}

export interface BelongsToMany<M extends Model> extends Relation<M> {
  getResults (): Promise<ICollection<M>>
  withTimestamps (): this
  wherePivot (
    column: any,
    operator?: any,
    value?: any,
    boolean?: string,
    ...args: any[]
  ): this
  wherePivotBetween (
    column: any,
    values: any,
    boolean?: string,
    not?: boolean,
  ): this
  orWherePivotBetween (column: any, values: any): this
  wherePivotNotBetween (column: any, values: any, boolean?: string): this
  orWherePivotNotBetween (column: any, values: any): this
  wherePivotIn (column: any, values: any, boolean?: string, not?: boolean): this
  orWherePivot (column: any, operator?: any, value?: any): this
  orWherePivotIn (column: any, values: any): this
  wherePivotNotIn (column: any, values: any, boolean?: string): this
  orWherePivotNotIn (column: any, values: any): this
  wherePivotNull (column: any, boolean?: string, not?: boolean): this
  wherePivotNotNull (column: any, boolean?: string): this
  orWherePivotNull (column: any, not?: boolean): this
  orWherePivotNotNull (column: any): this
  orderByPivot (column: any, direction?: string): this
}

export interface IModel {
  [value: string]: any
  attributes: any
  relations: any
  exists: boolean
  // primaryKey: string
  // builder?: IBuilder<any, any> | null
  // table: string | null
  connection?: TBaseConfig['client'] | null
  // keyType: string
  // incrementing: boolean
  perPage: number
  with: string | string[] | TGeneric<(...args: any[]) => IBuilder<Model>>
  // withCount: string[]
  trx: AnyQueryBuilder | null
  timestamps: boolean
  dateFormat: string
  visible: string[]
  hidden: string[]
  query<T extends { prototype: unknown }> (
    this: T,
    client?: AnyQueryBuilder | null,
  ): IBuilder<Model>
  on<T extends { prototype: unknown }> (
    this: T,
    connection: string | null,
  ): IBuilder<Model>
  boot (): void
  make<T extends IModel> (this: new () => T, attributes?: TGeneric): T
  addHook (hook: Hook, callback: TFunction): void
  creating (callback: TFunction): void
  created (callback: TFunction): void
  updating (callback: TFunction): void
  updated (callback: TFunction): void
  deleting (callback: TFunction): void
  deleted (callback: TFunction): void
  saving (callback: TFunction): void
  saved (callback: TFunction): void
  restoring (callback: TFunction): void
  restored (callback: TFunction): void
  trashed (callback: TFunction): void
  forceDeleted (callback: TFunction): void
  bootIfNotBooted (): void
  initialize (): void
  initializePlugins (): void
  addPluginInitializer (method: any): void
  newInstance (attributes?: TGeneric, exists?: boolean): any
  getKey (): string | number | null | undefined
  getKeyName (): string
  getConnectionName (): string
  getConnection (): any
  setConnection (connection: TBaseConfig['client'] | null): this
  usesUniqueIds (): boolean
  uniqueIds (): string[]
  // newUniqueId (): string;
  setUniqueIds (): void
  getKeyType (): string
  getIncrementing (): boolean
  setIncrementing (value: boolean): this
  getTable (): string
  setTable (table: string): this
  getDates (): string[]
  getDateFormat (): string
  getAttributes (): object
  getAttribute (key: string): any
  setAttribute (key: string, value: any): this
  fill (attributes: any): this
  setAppends (appends: string[]): this
  append (key: string | string[]): this
  getRelation<T extends Model> (
    relation: string,
  ): T | ICollection<T> | null | undefined
  getRelation<T extends Model, IsCollection extends boolean = false> (
    relation: string
  ): IsCollection extends true ? ICollection<T> | undefined : T | null | undefined;
  setRelation<T extends Model> (
    relation: string,
    value: T | ICollection<T> | null,
  ): this
  unsetRelation (relation: string): this
  relationLoaded (relation: string): boolean
  makeVisible (attributes: string | string[]): this
  makeHidden (attributes: string | string[]): this
  newCollection (models?: any[]): ICollection<Model>
  load (relations: WithRelationType): Promise<this>
  load (...relations: WithRelationType[]): Promise<this>
  loadAggregate (
    relations: WithRelationType,
    column: any,
    callback?: any,
  ): Promise<this>
  loadCount (...relations: WithRelationType[]): Promise<this>
  loadMax (relations: WithRelationType, column: string): Promise<this>
  loadMin (relations: WithRelationType, column: string): Promise<this>
  loadSum (relations: WithRelationType, column: string): Promise<this>
  usesTimestamps (): boolean
  updateTimestamps (): this
  getCreatedAtColumn (): string
  getUpdatedAtColumn (): string
  getDeletedAtColumn (): string
  setCreatedAt (value: string): this
  setUpdatedAt (value: string): this
  freshTimestamp (): Date
  freshTimestampString (): string
  fromDateTime (value: Date | number | null): string
  useSoftDeletes (): boolean
  toData (): any
  attributesToData (): any
  relationsToData (): any
  toJSON (): any
  toJson (): string
  toString (): string
  isDirty (attributes?: string | string[]): boolean
  getDirty (): string[]
  save (options?: any): Promise<boolean>
  update (attributes?: any, options?: any): Promise<boolean>
  increment (column: string, amount?: number, extra?: any): Promise<boolean>
  decrement (column: string, amount?: number, extra?: any): Promise<boolean>
  serializeDate (date: any): string
  delete (options?: any): Promise<boolean>
  softDelete (options?: any): Promise<boolean>
  forceDelete (options?: any): Promise<boolean>
  restore (options?: any): Promise<boolean>
  trashed (): boolean
  fresh (): Promise<this>
  refresh (): Promise<this | undefined>
  push (): Promise<boolean>
  is (model: this): boolean
  isNot (model: this): boolean
  // related(relation: string): Builder<any>;
  // getRelated<T extends IModel>(relation: string): Promise<this | Collection<T> | null>;
  related<T extends RelationNames<this>> (
    relation: T,
  ): ReturnTypeOfMethod<this, `relation${Capitalize<SnakeToCamelCase<T>>}`>
  getRelated<T extends RelationNames<this>> (
    relation: T,
  ): ReturnTypeOfMethod<
    ReturnTypeOfMethod<this, `relation${Capitalize<SnakeToCamelCase<T>>}`>,
    any
  > //'getResults'>;
  hasOne<T extends Model> (
    model: new () => T,
    foreignKey?: string,
    localKey?: string,
  ): HasOne<T>
  hasMany<T extends Model> (
    model: new () => T,
    foreignKey?: string,
    localKey?: string,
  ): HasMany<T>
  belongsTo<T extends Model> (
    model: new () => T,
    foreignKey?: string,
    ownerKey?: string,
    relation?: string,
  ): BelongsTo<T>
  belongsToMany<T extends Model> (
    model: new () => T,
    table?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    parentKey?: string,
    relatedKey?: string,
  ): BelongsToMany<T>
}
export type IPivot = IModel & {}

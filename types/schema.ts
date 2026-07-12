import type { Collection as BaseCollection } from '@h3ravel/collect.js'
import type Collection from 'src/collection'
import type { ModelBuilder } from './model-builder'
import type Model from 'src/model'

export type ModelRecord = object
export type RelationRecord = object

export type ModelAttributesOf<M> = M extends { readonly $attributes: infer Attributes }
  ? Attributes
  : never

export type ModelRelationsOf<M> = M extends { readonly $relations: infer Relations }
  ? Relations
  : never

export type ModelTableOf<M> = M extends { readonly $table: infer Table extends string }
  ? Table
  : string

export type ModelColumn<M> = [keyof ModelAttributesOf<M>] extends [never]
  ? string
  : Extract<keyof ModelAttributesOf<M>, string>
export type QualifiedModelColumn<M> =
  | ModelColumn<M>
  | `${ModelTableOf<M>}.${ModelColumn<M>}`

export type ModelColumnValue<
  M,
  Column extends string,
> = Column extends `${string}.${infer Name}`
  ? Name extends keyof ModelAttributesOf<M>
    ? ModelAttributesOf<M>[Name]
    : never
  : Column extends keyof ModelAttributesOf<M>
    ? ModelAttributesOf<M>[Column]
    : never

export type ModelInput<M> = Partial<ModelAttributesOf<M>>
export type ModelData<M> = ModelAttributesOf<M> & Partial<ModelRelationsOf<M>>
export type ModelRelation<M> = Extract<keyof ModelRelationsOf<M>, string>
export type ModelRelationPath<M> = [ModelRelation<M>] extends [never]
  ? string
  : ModelRelation<M> | `${ModelRelation<M>}.${string}`
type DeclaredModelKey<M> = 'id' extends keyof ModelAttributesOf<M>
  ? Extract<ModelAttributesOf<M>['id'], string | number>
  : never
export type ModelKey<M> = [DeclaredModelKey<M>] extends [never]
  ? string | number
  : DeclaredModelKey<M>

export type HydratedModel<
  Attributes extends ModelRecord,
  Relations extends RelationRecord = {},
  Table extends string = string,
> = Model<Attributes, Relations, Table> & Attributes & Partial<Relations>

export type DefinedModel<
  Attributes extends ModelRecord,
  Relations extends RelationRecord = {},
  Table extends string = string,
> = {
  new (attributes?: Partial<Attributes>): HydratedModel<Attributes, Relations, Table>
  query<M extends Model<any, any, any>>(this: ModelConstructor<M>): ModelBuilder<M>
  on<M extends Model<any, any, any>>(
    this: ModelConstructor<M>,
    connection?: string | null,
  ): ModelBuilder<M>
  init<M extends Model<any, any, any>>(
    this: ModelConstructor<M>,
    attributes?: ModelInput<M>,
  ): M
  make<M extends Model<any, any, any>>(
    this: ModelConstructor<M>,
    attributes?: ModelInput<M>,
  ): M
  booting(): void
  boot(): void
  booted(): void
  setConnectionResolver(resolver: unknown): void
  extend(plugin: (...args: any[]) => any, options: object): void
}

export type ModelConstructor<M extends Model<any, any, any> = Model> = {
  new (attributes?: ModelInput<M>): M
}

export type CollectionItem<C> = C extends Collection<infer Item>
  ? Item
  : C extends BaseCollection<infer Item>
    ? Item
    : never

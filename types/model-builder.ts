import type { Collection as ValueCollection } from '@h3ravel/collect.js'
import type { Knex } from 'knex'
import type Collection from 'src/collection'
import type Paginator from 'src/paginator'
import type Model from 'src/model'
import type { IBuilder } from './builder'
import type {
  ModelColumn,
  ModelColumnValue,
  ModelInput,
  ModelKey,
  ModelRelationPath,
  QualifiedModelColumn,
} from './schema'

export type QueryOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'ilike'
  | 'in'
  | 'not in'
  | (string & {})

export type QueryValue<Value> = Value | Knex.Raw | ModelBuilder<any>

export interface ModelBuilder<M extends Model = Model> {
  query: IBuilder<M>
  [method: string]: any
  where<Column extends ModelColumn<M>>(
    column: Column,
    value: QueryValue<ModelColumnValue<M, Column>>,
  ): this
  where<Column extends ModelColumn<M>>(
    column: Column,
    operator: QueryOperator,
    value: QueryValue<ModelColumnValue<M, Column>>,
  ): this
  where(attributes: ModelInput<M>): this
  where(callback: (query: ModelBuilder<M>) => unknown): this
  orWhere<Column extends ModelColumn<M>>(
    column: Column,
    value: QueryValue<ModelColumnValue<M, Column>>,
  ): this
  orWhere<Column extends ModelColumn<M>>(
    column: Column,
    operator: QueryOperator,
    value: QueryValue<ModelColumnValue<M, Column>>,
  ): this
  orWhere(callback: (query: ModelBuilder<M>) => unknown): this
  whereIn<Column extends ModelColumn<M>>(
    column: Column,
    values: ModelColumnValue<M, Column>[],
  ): this
  whereNotIn<Column extends ModelColumn<M>>(
    column: Column,
    values: ModelColumnValue<M, Column>[],
  ): this
  whereNull(column: ModelColumn<M>): this
  whereNotNull(column: ModelColumn<M>): this
  whereBetween<Column extends ModelColumn<M>>(
    column: Column,
    values: [ModelColumnValue<M, Column>, ModelColumnValue<M, Column>],
  ): this
  whereColumn(
    first: QualifiedModelColumn<M>,
    operator: QueryOperator,
    second: QualifiedModelColumn<M>,
  ): this
  select(
    ...columns: (
      | ModelColumn<M>
      | '*'
      | readonly (ModelColumn<M> | '*')[]
    )[]
  ): this
  orderBy(column: ModelColumn<M>, direction?: 'asc' | 'desc' | 'ASC' | 'DESC'): this
  latest(column?: ModelColumn<M>): this
  oldest(column?: ModelColumn<M>): this
  limit(count: number): this
  take(count: number): this
  offset(count: number): this
  skip(count: number): this
  with(
    ...relations: (
      | ModelRelationPath<M>
      | readonly ModelRelationPath<M>[]
      | Partial<
          Record<
            ModelRelationPath<M>,
            (query: ModelBuilder<any>) => unknown
          >
        >
    )[]
  ): this
  withCount(
    ...relations: (ModelRelationPath<M> | readonly ModelRelationPath<M>[])[]
  ): this
  first(columns?: ModelColumn<M>[]): Promise<M | null>
  firstOrFail(columns?: ModelColumn<M>[]): Promise<M>
  find(key: ModelKey<M>, columns?: ModelColumn<M>[]): Promise<M | null>
  findOrFail(key: ModelKey<M>, columns?: ModelColumn<M>[]): Promise<M>
  findMany(keys: ModelKey<M>[], columns?: ModelColumn<M>[]): Promise<Collection<M>>
  get(columns?: ModelColumn<M>[]): Promise<Collection<M>>
  all(columns?: ModelColumn<M>[]): Promise<Collection<M>>
  create(attributes?: ModelInput<M>): Promise<M>
  firstOrNew(attributes?: ModelInput<M>, values?: ModelInput<M>): Promise<M>
  firstOrCreate(attributes?: ModelInput<M>, values?: ModelInput<M>): Promise<M>
  updateOrCreate(attributes: ModelInput<M>, values?: ModelInput<M>): Promise<M>
  update(attributes: ModelInput<M>): Promise<number>
  increment(column: ModelColumn<M>, amount?: number, extra?: ModelInput<M>): Promise<number>
  decrement(column: ModelColumn<M>, amount?: number, extra?: ModelInput<M>): Promise<number>
  delete(): Promise<boolean | number>
  forceDelete(): Promise<boolean | number>
  count(column?: ModelColumn<M> | '*'): Promise<number>
  min(column: ModelColumn<M>): Promise<number>
  max(column: ModelColumn<M>): Promise<number>
  sum(column: ModelColumn<M>): Promise<number>
  avg(column: ModelColumn<M>): Promise<number>
  pluck<Column extends ModelColumn<M>>(
    column: Column,
  ): Promise<ValueCollection<ModelColumnValue<M, Column>>>
  paginate(page?: number, perPage?: number): Promise<Paginator<M>>
  clone(): ModelBuilder<M>
  getModel(): M
  toSql(): object
}

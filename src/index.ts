import { Seeder, SeederCreator, SeederRunner } from './seeders'

import Attribute from './casts/attribute'
import Builder from './builder'
import CastsAttributes from './casts-attributes'
import Collection from './collection'
import HasUniqueIds from './concerns/has-unique-ids'
import type { IPaginatorParams } from 'types/utils'
import { Migrate } from './migrate'
import Migration from './migrations/migration'
import Model from './model'
import Paginator from './paginator'
import Pivot from './pivot'
import QueryBuilder from './query-builder'
import Scope from './scope'
import SoftDeletes from './soft-deletes'
import type { TGeneric } from 'types/generics'
import arquebus from './arquebus'
import { isArray } from 'radashi'

interface IMake {
  <T extends Model> (model: T, data: TGeneric): T
  <T extends Model> (model: T, data: Array<TGeneric>): Collection<T>
  <T extends Model> (model: T, data: TGeneric, options: { paginated?: IPaginatorParams }): Paginator<T>
}

const make: IMake = <T extends Model> (
  model: T,
  data: TGeneric,
  options = {} as any,
): Collection<T> | Paginator<T> | T => {
  const { paginated } = options

  if (paginated) {
    return new Paginator<T>(
      data.data.map((item: Model) => model.make(item)),
      data.total,
      data.per_page,
      data.current_page,
    ) as never
  }

  if (isArray(data)) {
    return new Collection<T>(data.map((item) => model.make(item)))
  }
  return model.make(data)
}

const makeCollection = <T extends Model> (model: T, data: TGeneric) =>
  new Collection(data.map((item: Model) => model.make(item)))

const makePaginator = <T extends Model> (model: T, data: TGeneric) =>
  new Paginator<T>(
    data.data.map((item: Model) => model.make(item)),
    data.total,
    data.per_page,
    data.current_page,
  )

export * from './errors'
export * from './utils'

// named exports
export {
  arquebus,
  Paginator,
  Collection,
  QueryBuilder,
  Model,
  Pivot,
  Builder,
  Attribute,
  CastsAttributes,
  Migration,
  Seeder,
  SeederCreator,
  SeederRunner,
  Migrate,
  Scope,
  SoftDeletes,
  HasUniqueIds,
  make,
  makeCollection,
  makePaginator,
}

import { Seeder, SeederCreator, SeederRunner } from './seeders'

import Attribute from './casts/attribute'
import Builder from './builder'
import CastsAttributes from './casts-attributes'
import Collection from './collection'
import HasUniqueIds from './concerns/has-unique-ids'
import type { IMake } from './contracts/utilities'
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

const makeCollection = <T extends typeof Model> (model: T, data: TGeneric) =>
  new Collection(data.map((item: Model) => model.make(item)))

const makePaginator = <T extends typeof Model> (model: T, data: TGeneric) =>
  // @ts-expect-error ignore or revisit
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

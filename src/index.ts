import Attribute from './casts/attribute'
import Builder from './builder'
import CastsAttributes from './casts-attributes'
import Collection from './collection'
import HasUniqueIds from './concerns/has-unique-ids'
import type { IPaginatorParams } from 'types/utils'
import { Migrate } from './migrate'
import Migration from './migrations/migration'
import { Seeder, SeederCreator, SeederRunner } from './seeders'
import Model from './model'
import Paginator from './paginator'
import Pivot from './pivot'
import QueryBuilder from './query-builder'
import Scope from './scope'
import SoftDeletes from './soft-deletes'
import type { TGeneric } from 'types/generics'
import arquebus from './arquebus'

const make = <M extends Model | typeof Model>(
  model: M,
  data: TGeneric,
  options = {} as { paginated: IPaginatorParams | boolean },
) => {
  const { paginated } = options
  if (paginated) {
    return new Paginator(
      data.data.map((item: Model) => model.make(item)),
      data.total,
      data.per_page,
      data.current_page,
    )
  }
  if (Array.isArray(data)) {
    return new Collection(data.map((item) => model.make(item)))
  }
  return model.make(data)
}

const makeCollection = <M extends Model | typeof Model>(
  model: M,
  data: TGeneric,
) => new Collection(data.map((item: Model) => model.make(item)))

const makePaginator = <M extends Model | typeof Model>(
  model: M,
  data: TGeneric,
  _: any,
) =>
  new Paginator(
    data.data.map((item: Model) => model.make(item)),
    data.total,
    data.per_page,
    data.current_page,
  )

export * from './errors'
export * from './utils'
export * from './type-generator'

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

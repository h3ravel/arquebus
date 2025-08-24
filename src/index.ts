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

const make = (model: Model, data: TGeneric, options = {} as { paginated: IPaginatorParams }) => {
  const { paginated } = options
  if (paginated) {
    return new Paginator(
      data.data.map((item: Model) => model.make(item)),
      data.total,
      data.per_page,
      data.current_page
    )
  }
  if (Array.isArray(data)) {
    return new Collection(data.map(item => model.make(item)))
  }
  return model.make(data)
}

const makeCollection = (model: Model, data: TGeneric) =>
  new Collection(data.map((item: Model) => model.make(item)))

const makePaginator = (model: Model, data: TGeneric) =>
  new Paginator(
    data.data.map((item: Model) => model.make(item)),
    data.total,
    data.per_page,
    data.current_page
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
  Migrate,
  Scope,
  SoftDeletes,
  HasUniqueIds,
  make,
  makeCollection,
  makePaginator,
} 

import { migrateRollback, migrateRun, migrateStatus } from './migrate'

import Attribute from './casts/attribute'
import Builder from './builder'
import CastsAttributes from './casts-attributes'
import Collection from './collection'
import HasUniqueIds from './concerns/has-unique-ids'
import Migration from './migrations/migration'
import Model from './model'
import Paginator from './paginator'
import Pivot from './pivot'
import QueryBuilder from './query-builder'
import Scope from './scope'
import SoftDeletes from './soft-deletes'
import arquebus from './arquebus'

const make = (model, data, options = {}) => {
  const { paginated } = options
  if (paginated) {
    return new Paginator(
      data.data.map(item => model.make(item)),
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

const makeCollection = (model, data) =>
  new Collection(data.map(item => model.make(item)))

const makePaginator = (model, data) =>
  new Paginator(
    data.data.map(item => model.make(item)),
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
  Scope,
  SoftDeletes,
  HasUniqueIds,
  make,
  makeCollection,
  makePaginator,
  migrateRun,
  migrateRollback,
  migrateStatus,
} 

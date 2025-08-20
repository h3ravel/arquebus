import { migrateRollback, migrateRun, migrateStatus } from './migrate'

import Attribute from './casts/attribute'
import Builder from './builder'
import CastsAttributes from './casts-attributes'
import Collection from './collection'
import Errors from './errors'
import HasUniqueIds from './concerns/has-unique-ids'
import Migration from './migrations/migration'
import Model from './model'
import Paginator from './paginator'
import Pivot from './pivot'
import Scope from './scope'
import SoftDeletes from './soft-deletes'
import sutando from './sutando'
import utils from './utils'

const make = (model, data, options = {}) => {
  const { paginated } = options
  if (paginated) {
    return new Paginator(data.data.map(item => model.make(item)), data.total, data.per_page, data.current_page)
  }
  if (Array.isArray(data)) {
    return new Collection(data.map(item => model.make(item)))
  }
  return model.make(data)
}
const makeCollection = (model, data) => new Collection(data.map(item => model.make(item)))
const makePaginator = (model, data) => new Paginator(data.data.map(item => model.make(item)), data.total, data.per_page, data.current_page)
export { sutando }
export { Paginator }
export { Collection }
export { Model }
export { Pivot }
export { Builder }
export { Attribute }
export { CastsAttributes }
export { Migration }
export { Scope }
export { SoftDeletes }
export { HasUniqueIds }
export { make }
export { makeCollection }
export { makePaginator }
export { migrateRun }
export { migrateRollback }
export { migrateStatus }
export * from './errors'
export * from './utils'
export default {
  sutando,
  Paginator,
  Collection,
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
  ...Errors,
  ...utils
}

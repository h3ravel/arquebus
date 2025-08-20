import Attribute from 'src/casts/attribute'
import CastsAttributes from 'src/casts-attributes'
import Collection from './collection'
import Errors from 'src/errors'
import HasUniqueIds from 'src/concerns/has-unique-ids'
import Model from './model'
import Paginator from './paginator'
import Pivot from './pivot'
import { isArray } from 'radashi'
import utils from 'src/utils'
const make = (model, data, options = {}) => {
  const { paginated } = options
  if (paginated) {
    return new Paginator(data.data.map(item => model.make(item)), data.total, data.per_page, data.current_page)
  }
  if (isArray(data)) {
    return new Collection(data.map(item => model.make(item)))
  }
  return model.make(data)
}
const makeCollection = (model, data) => new Collection(data.map(item => model.make(item)))
const makePaginator = (model, data) => new Paginator(data.data.map(item => model.make(item)), data.total, data.per_page, data.current_page)
const isBrowser = true
export { isBrowser }
export { Paginator }
export { Collection }
export { Model }
export { Pivot }
export { Attribute }
export { CastsAttributes }
export { HasUniqueIds }
export { make }
export { makeCollection }
export { makePaginator }
export default {
  isBrowser,
  Paginator,
  Collection,
  Model,
  Pivot,
  Attribute,
  CastsAttributes,
  HasUniqueIds,
  make,
  makeCollection,
  makePaginator,
  ...Errors,
  ...utils
}

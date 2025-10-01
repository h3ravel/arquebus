import Attribute from '../casts/attribute'
import CastsAttributes from '../casts-attributes'
import Collection from './collection'
import HasUniqueIds from '../concerns/has-unique-ids'
import type { IPaginatorParams } from 'types/utils'
import Model from './model'
import Paginator from './paginator'
import Pivot from './pivot'
import type { TGeneric } from 'types/generics'
import { isArray } from 'radashi'

const make = (
  model: Model,
  data: TGeneric,
  options = {} as { paginated: IPaginatorParams },
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

  if (isArray(data)) {
    return new Collection(data.map((item) => model.make(item)))
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
    data.current_page,
  )

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
export * from '../utils'
export * from '../errors'
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
}

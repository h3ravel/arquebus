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

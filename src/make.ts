import Collection from './collection'
import type { IMake } from './contracts/utilities'
import type Model from './model'
import Paginator from './paginator'
import type { TGeneric } from 'types/generics'
import { isArray } from 'radashi'

export const make: IMake = <T extends Model> (
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

export const makeCollection = <T extends typeof Model> (model: T, data: TGeneric) =>
    new Collection(data.map((item: Model) => model.make(item)))

export const makePaginator = <T extends typeof Model> (model: T, data: TGeneric) =>
    // @ts-expect-error ignore or revisit
    new Paginator<T>(
        data.data.map((item: Model) => model.make(item)),
        data.total,
        data.per_page,
        data.current_page,
    )
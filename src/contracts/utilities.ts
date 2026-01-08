import type Collection from '../collection'
import type { IPaginatorParams } from '../../types/utils'
import type Model from '../model'
import type Paginator from '../paginator'
import type { TGeneric } from '../../types'

type DeepWrappedData<D> = {
    [K in keyof D]: D[K] extends Array<infer V>
    // @ts-expect-error ignore or revisit
    ? Collection<DeepWrappedData<V>> // Recurse into array items
    : D[K] extends object
    ? DeepWrappedData<D[K]>          // Recurse into nested objects
    : D[K]
}

export interface IMake {
    // Single object: Transform arrays in D to Collections
    <T extends typeof Model, D extends TGeneric> (
        model: T,
        data: D
    ): InstanceType<T> & DeepWrappedData<D>

    // Array of objects: Transform the items inside the Collection
    <T extends typeof Model, D extends TGeneric> (
        model: T,
        data: Array<D>
    ): Collection<InstanceType<T> & DeepWrappedData<D>>

    // Paginated: Transform the items inside the Paginator
    <T extends typeof Model, D extends TGeneric> (
        model: T,
        data: D,
        options: IPaginatorParams
    ): Paginator<InstanceType<T> & DeepWrappedData<D>>
}
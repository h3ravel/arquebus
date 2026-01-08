import type BModel from 'src/browser/model'
import type { Collection as BaseCollection } from 'collect.js'
import type Collection from 'src/collection'
import type { IBuilder } from './builder'
import type { IModel } from './modeling'
import type Model from 'src/model'
import type { TGeneric } from './generics'

export interface ICollection<T extends Model | BModel>
  extends BaseCollection<T> {
  items?: T[]
  load (...relations: T[]): Promise<ICollection<T>>
  loadAggregate (
    relations: T | T[],
    column: string,
    action?: string | null,
  ): Promise<this>
  loadCount (relation: T, column: string): Promise<this>
  loadMax (relation: T, column: string): Promise<this>
  loadMin (relation: T, column: string): Promise<this>
  loadSum (relation: T, column: string): Promise<this>
  loadAvg (relation: T, column: string): Promise<this>
  mapThen (callback: () => void): Promise<any>
  modelKeys (): string[] | number[]
  contains (key: IModel | any, operator?: any, value?: any): boolean
  diff (items: ICollection<T> | any[]): ICollection<T>
  except (keys: any[]): ICollection<T>
  intersect (items: T[]): ICollection<T>
  unique (key?: any, strict?: boolean): ICollection<T>
  find (key: any, defaultValue?: any): any
  fresh (withs?: any[]): Promise<ICollection<T>>
  makeVisible (attributes: string | string[]): this
  makeHidden (attributes: string | string[]): this
  append (attributes: string[]): this
  only (keys: null | any[]): this
  getDictionary (items?: any[]): TGeneric
  toQuery (): IBuilder<T, any>
  toData (): any
  toJSON (): any
  toJson (): string
  toString (): string
  [key: string]: any
  [Symbol.iterator]: () => Iterator<T>
}

export interface IPaginatorParams {
  current_page?: number
  data?: any[]
  per_page?: number
  total?: number
  last_page?: number
  count?: number
  paginated?: boolean
}

export interface IPaginator<
  T extends Model | BModel,
  K extends IPaginatorParams = IPaginatorParams,
> {
  formatter?(paginator: IPaginator<any>): any | null
  setFormatter?(formatter: (paginator: IPaginator<any>) => any | null): void
  setItems (items: T[] | Collection<T>): void
  hasMorePages (): boolean
  get (index: number): T | null
  count (): number
  items (): Collection<T>
  map (callback: (value: T, index: number) => T): Collection<T>
  currentPage (): number
  perPage (): number
  lastPage (): number
  firstItem (): number | null
  lastItem (): number | null
  total (): number
  toData<U = K> (): U
  toJSON<U = K> (): U
  toJson (): string
  [Symbol.iterator]?(): { next: () => { value: T; done: boolean } }
}

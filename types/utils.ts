import type BModel from 'src/browser/model'
import type Collection from 'src/collection'
import type Model from 'src/model'

export type ICollection<T extends Model | BModel> = Collection<T>

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

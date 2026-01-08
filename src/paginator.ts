import type { IPaginator, IPaginatorParams } from 'types/utils'

import Collection from './collection'
import type { Model } from 'src/model'
import type { TGeneric } from 'types/generics'

class Paginator<T extends Model, K extends IPaginatorParams = IPaginatorParams>
  implements IPaginator<T, K> {
  static formatter: (paginator: IPaginator<any>) => any | null
  _items: Collection<T>
  _total: number
  _perPage: number
  _lastPage: number
  _currentPage: number
  hasMore: boolean = false
  options: TGeneric = {}

  static setFormatter (
    formatter?: ((paginator: IPaginator<any> | null) => any) | null,
  ) {
    if (typeof formatter !== 'function' && formatter != null) {
      throw new Error('Paginator formatter must be a function or null')
    }

    if (!formatter) return

    this.formatter = formatter
  }

  constructor(
    items: T[],
    total: number,
    perPage: number,
    currentPage: number = 1,
    options: TGeneric = {},
  ) {
    this.options = options
    for (const key in options) {
      const value = options[key]
        ; (this as any)[key] = value
    }
    this._items = new Collection<T>([])
    this._total = total
    this._perPage = parseInt(String(perPage))
    this._lastPage = Math.max(Math.ceil(total / perPage), 1)
    this._currentPage = currentPage
    this.setItems(items)
  }
  setItems (items: T[]) {
    this._items = items instanceof Collection ? items : new Collection<T>(items)
    this.hasMore = this._items.count() > this._perPage
    this._items = this._items.slice(0, this._perPage) as any
  }
  firstItem () {
    return this.count() > 0 ? (this._currentPage - 1) * this._perPage + 1 : null
  }
  lastItem () {
    return this.count() > 0 ? (this.firstItem() ?? 0) + this.count() - 1 : null
  }
  hasMorePages () {
    return this._currentPage < this._lastPage
  }
  get (index: number) {
    return this._items.get(index)
  }
  count () {
    return this._items.count()
  }
  items () {
    return this._items
  }
  map (callback: (value: T, index: number) => T) {
    return this._items.map(callback) as Collection<T>
  }
  currentPage () {
    return this._currentPage
  }
  onFirstPage () {
    return this._currentPage === 1
  }
  perPage () {
    return this._perPage
  }
  lastPage () {
    return this._lastPage
  }
  total () {
    return this._total
  }
  toData () {
    if (
      (this.constructor as any).formatter &&
      typeof (this.constructor as any).formatter === 'function'
    ) {
      return (this.constructor as any).formatter(this)
    }
    return {
      current_page: this._currentPage,
      data: this._items.toData(),
      per_page: this._perPage,
      total: this._total,
      last_page: this._lastPage,
      count: this.count(),
    }
  }
  toJSON () {
    return this.toData()
  }
  toJson (...args: any[]) {
    return JSON.stringify(this.toData(), ...args)
  }
}
export default Paginator

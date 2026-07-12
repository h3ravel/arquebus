import { Collection as BaseCollection, collect } from '@h3ravel/collect.js'
import type { TFunction, TGeneric } from 'types/generics'
import { isArray, isEmpty, omit, pick } from 'radashi'

import type { ICollection } from 'types/utils'
import type { IModel } from 'types/modeling'
import Model from './model'

class Collection<I extends Model> extends BaseCollection<I> {
  mapThen (callback: TFunction) {
    return Promise.all(this.map(callback))
  }

  modelKeys () {
    return this.all().map((item) => item.getKey())
  }
  contains<K, V> (key: keyof I | K | TFunction, value?: V): boolean
  contains<K, V> (key: K, operator?: string, value?: V) {
    if (arguments.length > 1) {
      return super.contains(key, value ?? operator) //, value)
    }
    if (key instanceof Model) {
      return super.contains((model: Model) => {
        return model.is(key)
      })
    }
    return super.contains((model: Model) => {
      return model.getKey() == key
    })
  }
  override diff<T = I> (items: BaseCollection<I> | T[]) {
    const diff = new (this.constructor as any)()
    const dictionary = this.getDictionary(items)
    this.all().map((item) => {
      if (dictionary[item.getKey()] == null) {
        diff.add(item)
      }
    })
    return diff
  }
  override except<K = I> (...keys: K[]) {
    const values = keys.length === 1 && Array.isArray(keys[0])
      ? (keys[0] as unknown[]).map(String)
      : keys.map(String)
    const dictionary = omit(this.getDictionary(), values)
    return new (this.constructor as any)(Object.values(dictionary))
  }
  intersect (items: I[]) {
    const intersect = new (this.constructor as any)()
    if (isEmpty(items)) {
      return intersect
    }
    const dictionary = this.getDictionary(items)
    for (const item of this.all()) {
      if (dictionary[item.getKey()] != null) {
        intersect.add(item)
      }
    }
    return intersect
  }
  unique (key?: TFunction | keyof I, _strict = false) {
    if (key) {
      return super.unique(key) //, strict)
    }
    return new (this.constructor as any)(Object.values(this.getDictionary()))
  }
  find (key: any, defaultValue = null) {
    // const Model = Model
    if (key instanceof Model) {
      key = key.getKey()
    }
    if (isArray(key)) {
      if (this.isEmpty()) {
        return new (this.constructor as any)()
      }
      return this.whereIn(this.first()!.getKeyName(), key)
    }
    collect(this.all() as unknown as Model[]).first((model) => {
      return model.getKey() == key
    })
    return (
      (this.all() as unknown as any[]).filter((model) => {
        return model.getKey() == key
      })[0] || defaultValue
    )
  }
  makeVisible (attributes: any) {
    return this.each((item) => {
      item.makeVisible(attributes)
    })
  }
  makeHidden (attributes: any) {
    return this.each((item) => {
      item.makeHidden(attributes)
    })
  }
  append (attributes: any) {
    return this.each((item) => {
      item.append(attributes)
    })
  }
  override only<K = I> (...keys: K[]) {
    const values = keys.length === 1 && Array.isArray(keys[0])
      ? (keys[0] as unknown[]).map(String)
      : keys.map(String)
    const dictionary = pick(this.getDictionary(), values)
    return new (this.constructor as any)(Object.values(dictionary))
  }
  getDictionary (items?: BaseCollection<any> | any[]) {
    const values = !items
      ? this.all()
      : items instanceof BaseCollection
        ? items.all() as any[]
        : items
    const dictionary: TGeneric = {}
    values.map((value) => {
      dictionary[value.getKey()] = value
    })
    return dictionary
  }
  toData () {
    return this.all().map((item) =>
      typeof item.toData == 'function' ? item.toData() : item,
    )
  }
  override toJSON (): I[] {
    return this.toData() as I[]
  }
  toJson (...args: any[]) {
    return JSON.stringify(this.toData(), ...args)
  }
  [Symbol.iterator]: () => Iterator<I> = () => {
    const items = this.all()
    const length = items.length
    let n = 0
    return {
      next () {
        return n < length
          ? {
            value: (items as any)[n++],
            done: false,
          }
          : {
            done: true,
          }
      },
    } as Iterator<I>
  }
}
export default Collection

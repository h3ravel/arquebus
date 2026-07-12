import { Collection as BaseCollection, collect } from '@h3ravel/collect.js'
import type { TFunction, TGeneric } from 'types/generics'
import { Arr } from '@h3ravel/support'

import Model from './model'
import type BModel from './browser/model'

class Collection<I extends Model | BModel> extends BaseCollection<I> {
  private newConstructor(...args: any[]) {
    const constr = this.getConstructor()

    return new constr(...args)
  }

  getConstructor<T extends typeof Collection<I>>(this: InstanceType<T>) {
    return this.constructor as T
  }

  async load(...relations: (string[] | I[] | string | I)[]) {
    if (this.isNotEmpty()) {
      const query = (this.first() as any).constructor.query().with(...relations)
      const items = await query.eagerLoadRelations(this.all())

      return this.newConstructor(items)
    }
    return this
  }

  async loadAggregate<I>(
    relations: I,
    column: string,
    action: string | null | TFunction = null,
  ) {
    if (this.isEmpty()) {
      return this
    }
    const first = this.first()!
    const models = (
      await (first.newModelQuery() as any)
        .whereIn(first.getKeyName(), this.modelKeys())
        .select(first.getKeyName())
        .withAggregate(relations, column, action)
        .get()
    ).keyBy(first.getKeyName())
    const attributes = collect(Object.keys(models.first().getAttributes()))
      .diff([models.first().getKeyName()])
      .all()
    this.each((model) => {
      const extraAttributes = Arr.select(
        models.get(model.getKey()).getAttributes(),
        attributes,
      )
      model.fill(extraAttributes).syncOriginalAttributes(...attributes)
    })
    return this
  }

  loadCount(relations: I) {
    return this.loadAggregate(relations, '*', 'count')
  }

  loadMax(relation: I, column: string) {
    return this.loadAggregate(relation, column, 'max')
  }
  loadMin(relation: I, column: string) {
    return this.loadAggregate(relation, column, 'min')
  }
  loadSum(relation: I, column: string) {
    return this.loadAggregate(relation, column, 'sum')
  }
  loadAvg(relation: I, column: string) {
    return this.loadAggregate(relation, column, 'avg')
  }
  mapThen(callback: () => void) {
    return Promise.all(this.map(callback))
  }
  modelKeys() {
    return this.all().map((item) => item.getKey())
  }
  contains<K, V>(key: keyof I | K | TFunction, value?: V): boolean
  contains<K, V>(key: K, operator?: string, value?: V) {
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
  override diff<T = I>(items: BaseCollection<I> | T[]) {
    const diff = new (this.constructor as any)()
    const dictionary = this.getDictionary(items)
    this.all().map((item) => {
      if (dictionary[item.getKey()] === undefined) {
        diff.add(item)
      }
    })
    return diff
  }
  override except<K = I>(...keys: K[]) {
    const values = keys.length === 1 && Array.isArray(keys[0])
      ? (keys[0] as unknown[]).map(String)
      : keys.map(String)
    const dictionary = Arr.except(this.getDictionary(), values)
    return new (this.constructor as any)(Object.values(dictionary))
  }
  intersect(items: I[]) {
    const intersect = new (this.constructor as any)()
    if (Arr.isEmpty(items)) {
      return intersect
    }
    const dictionary = this.getDictionary(items)
    for (const item of this.all()) {
      if (dictionary[item.getKey()] !== undefined) {
        intersect.add(item)
      }
    }
    return intersect
  }
  unique(key?: TFunction | keyof I, _strict = false) {
    if (key) {
      return super.unique(key) //, strict)
    }
    return new (this.constructor as any)(Object.values(this.getDictionary()))
  }
  find(key: any, defaultValue = null) {
    // const Model = Model
    if (key instanceof Model) {
      key = key.getKey()
    }
    if (Array.isArray(key)) {
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
  async fresh(...args: any[]) {
    if (this.isEmpty()) {
      return new (this.constructor as any)()
    }
    const model = this.first()
    if (!model) return new (this.constructor as any)()
    const freshModels = (
      await (model.newQuery() as any)
        .with(...args)
        .whereIn(model.getKeyName(), this.modelKeys())
        .get()
    ).getDictionary()
    return this.filter((model) => {
      return model.exists && freshModels[model.getKey()] !== undefined
    }).map((model) => {
      return freshModels[model.getKey()]
    })
  }
  makeVisible(attributes: any) {
    return this.each((item) => {
      item.makeVisible(attributes)
    })
  }
  makeHidden(attributes: any) {
    return this.each((item) => {
      item.makeHidden(attributes)
    })
  }
  append(attributes: any) {
    return this.each((item) => {
      item.append(attributes)
    })
  }
  override only<K = I>(...keys: K[]) {
    const values = keys.length === 1 && Array.isArray(keys[0])
      ? (keys[0] as unknown[]).map(String)
      : keys.map(String)
    const dictionary = Arr.select(this.getDictionary(), values)
    return new (this.constructor as any)(Object.values(dictionary))
  }
  getDictionary(items?: BaseCollection<any> | any[]) {
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
  toQuery() {
    const model = this.first()
    if (!model) {
      throw new Error('Unable to create query for empty collection.')
    }
    const modelName = model.constructor.name as any
    if (
      this.filter((model) => {
        return !(model instanceof modelName)
      }).isNotEmpty()
    ) {
      throw new Error('Unable to create query for collection with mixed types.')
    }
    return (model.newModelQuery() as any).whereKey(this.modelKeys())
  }
  toData() {
    return this.all().map((item) =>
      typeof item.toData == 'function' ? item.toData() : item,
    )
  }
  override toJSON(): I[] {
    return this.toData() as I[]
  }
  toJson(...args: any[]) {
    return JSON.stringify(this.toData(), ...args)
  }
  [Symbol.iterator]: () => Iterator<I> = () => {
    const items = this.all()
    const length = items.length
    let n = 0
    return {
      next() {
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

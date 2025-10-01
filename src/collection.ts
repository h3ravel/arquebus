import { Collection as BaseCollection, collect } from 'collect.js'
import type { TFunction, TGeneric } from 'types/generics'
import { diff as difference, isArray, isEmpty, omit, pick } from 'radashi'

import type { ICollection } from 'types/utils'
import Model from './model'
import type BModel from './browser/model'

class Collection<I extends Model | BModel>
  extends BaseCollection<I>
  implements ICollection<I>
{
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
      const items = await query.eagerLoadRelations(this.items)

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
    const models = (
      await (this.first().newModelQuery() as any)
        .whereIn(this.first().getKeyName(), this.modelKeys())
        .select(this.first().getKeyName())
        .withAggregate(relations, column, action)
        .get()
    ).keyBy(this.first().getKeyName())
    const attributes = difference(Object.keys(models.first().getAttributes()), [
      models.first().getKeyName(),
    ])
    this.each((model) => {
      const extraAttributes = pick(
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
  diff(items: ICollection<any> | any[]) {
    const diff = new (this.constructor as any)()
    const dictionary = this.getDictionary(items)
    ;(this.items as unknown as any[]).map((item) => {
      if (dictionary[item.getKey()] === undefined) {
        diff.add(item)
      }
    })
    return diff
  }
  except(keys: any[]) {
    const dictionary = omit(this.getDictionary(), keys)
    return new (this.constructor as any)(Object.values(dictionary))
  }
  intersect(items: I[]) {
    const intersect = new (this.constructor as any)()
    if (isEmpty(items)) {
      return intersect
    }
    const dictionary = this.getDictionary(items)
    for (const item of this.items as any) {
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
    if (isArray(key)) {
      if (this.isEmpty()) {
        return new (this.constructor as any)()
      }
      return this.whereIn(this.first().getKeyName(), key)
    }
    collect(this.items as unknown as Model[]).first((model) => {
      return model.getKey() == key
    })
    return (
      (this.items as unknown as any[]).filter((model) => {
        return model.getKey() == key
      })[0] || defaultValue
    )
  }
  async fresh(...args: any[]) {
    if (this.isEmpty()) {
      return new (this.constructor as any)()
    }
    const model = this.first()
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
  only(keys: any[]) {
    if (keys === null) {
      return new Collection(this.items)
    }
    const dictionary = pick(this.getDictionary(), keys)
    return new (this.constructor as any)(Object.values(dictionary))
  }
  getDictionary(items?: ICollection<any> | any[]) {
    items = !items ? (this.items as unknown as any[]) : items
    const dictionary: TGeneric = {}
    items.map((value) => {
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
  toJSON() {
    return this.toData()
  }
  toJson(...args: any[]) {
    return JSON.stringify(this.toData(), ...args)
  }
  [Symbol.iterator]: () => Iterator<I> = () => {
    const items = this.items
    const length = this.items.length
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

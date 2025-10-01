import type { MixinConstructor, TGeneric } from 'types/generics'

import Collection from '../collection'
import type { Model } from '../model'
import collect from 'collect.js'
import { tap } from '../utils'

const HasOneOrMany = <TBase extends MixinConstructor>(Relation: TBase) => {
  return class extends Relation {
    getRelationValue(dictionary: TGeneric, key: string, type: string) {
      const value = dictionary[key]
      return type === 'one' ? value[0] : new Collection(value)
    }
    matchOneOrMany(
      models: Model[],
      results: any,
      relation: string,
      type: string,
    ) {
      const dictionary = this.buildDictionary(results)
      models.map((model) => {
        const key = model.attributes[this.localKey]
        if (dictionary[key] !== undefined) {
          model.setRelation(
            relation,
            this.getRelationValue(dictionary, key, type),
          )
        }
      })
      return models
    }
    buildDictionary(results: any) {
      const foreign = this.getForeignKeyName()
      return collect(results)
        .mapToDictionary((result: any) => [result[foreign], result])
        .all()
    }
    async save(model: Model) {
      this.setForeignAttributesForCreate(model)
      return (await model.save()) ? model : false
    }
    async saveMany(models: Model[]) {
      await Promise.all(
        models.map(async (model) => {
          await this.save(model)
        }),
      )
      return models instanceof Collection ? models : new Collection(models)
    }
    async create(attributes = {}) {
      return await tap(
        this.related.constructor.init(attributes),
        async (instance) => {
          this.setForeignAttributesForCreate(instance)
          await instance.save()
        },
      )
    }
    async createMany(records: any[]) {
      const instances = await Promise.all(
        records.map(async (record: TGeneric) => {
          return await this.create(record)
        }),
      )
      return instances instanceof Collection
        ? instances
        : new Collection(instances)
    }
    setForeignAttributesForCreate(model: Model) {
      model[this.getForeignKeyName()] = this.getParentKey()
    }
    getForeignKeyName() {
      const segments = this.getQualifiedForeignKeyName().split('.')
      return segments[segments.length - 1]
    }
    getParentKey() {
      return this.parent.attributes[this.localKey]
    }
    getQualifiedForeignKeyName() {
      return this.foreignKey
    }
    getExistenceCompareKey() {
      return this.getQualifiedForeignKeyName()
    }
    addConstraints() {
      if ((this as any).constructor.constraints) {
        const query = this.getRelationQuery()
        query.where(this.foreignKey, '=', this.getParentKey())
        query.whereNotNull(this.foreignKey)
      }
    }
  }
}
export default HasOneOrMany

import Collection from '../collection'
import HasOneOrMany from './has-one-or-many'
import type { Model } from 'src/model'
import Relation from './relation'
import { collect } from 'collect.js'
import { compose } from '../utils'

class HasMany extends compose(Relation, HasOneOrMany) {
  foreignKey?: string | null
  localKey?: string | null

  constructor(query: any, parent: any, foreignKey?: string | null, localKey?: string | null) {
    super(query, parent)
    this.foreignKey = foreignKey
    this.localKey = localKey
    this.addConstraints()
    return this.asProxy()
  }

  initRelation (models: Model[], relation: string) {
    models.map(model => {
      model.setRelation(relation, new Collection([]))
    })
    return models
  }

  async getResults () {
    return this.getParentKey() !== null
      ? await this.query.get()
      : new Collection([])
  }

  getForeignKeyName () {
    const segments = this.foreignKey?.split('.')
    return segments?.pop()
  }

  buildDictionary (results: any) {
    const foreign = this.getForeignKeyName()!
    return collect(results).mapToDictionary((result: any) => [
      result[foreign], result
    ]).all()
  }

  match (models: Model[], results: any, relation: string) {
    return this.matchOneOrMany(models, results, relation, 'many')
  }

  addEagerConstraints (models: Model[]) {
    this.query.whereIn(this.foreignKey!, this.getKeys(models, this.localKey))
  }
}
export default HasMany

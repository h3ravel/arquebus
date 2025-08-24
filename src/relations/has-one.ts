import type { Builder } from 'src/builder'
import HasOneOrMany from './has-one-or-many'
import type { Model } from 'src/model'
import Relation from './relation'
import SupportsDefaultModels from './concerns/supports-default-models'
import { compose } from 'src/utils'

class HasOne extends compose(
  Relation,
  HasOneOrMany,
  SupportsDefaultModels
) {
  foreignKey?: string | null
  localKey?: string | null

  constructor(query: Builder, parent: Builder, foreignKey?: string | null, localKey?: string | null) {
    super(query, parent)
    this.foreignKey = foreignKey
    this.localKey = localKey
    this.addConstraints()
    return this.asProxy()
  }
  initRelation (models: Model[], relation: string) {
    models.map(model => {
      model.setRelation(relation, this.getDefaultFor(model))
    })
    return models
  }
  matchOne (models: Model[], results: any, relation: string) {
    return this.matchOneOrMany(models, results, relation, 'one')
  }
  getForeignKeyName () {
    const segments = this.foreignKey?.split('.')
    return segments?.pop()
  }
  async getResults () {
    if (this.getParentKey() === null) {
      return this.getDefaultFor(this.parent)
    }
    const results = await this.query.first()
    return results || this.getDefaultFor(this.parent)
  }
  match (models: Model[], results: any, relation: string) {
    return this.matchOneOrMany(models, results, relation, 'one')
  }
  addEagerConstraints (models: Model[]) {
    this.query.whereIn(this.foreignKey!, this.getKeys(models, this.localKey))
  }
  newRelatedInstanceFor (parent: Model) {
    return this.related.newInstance().setAttribute(this.getForeignKeyName(), parent[this.localKey!])
  }
}
export default HasOne

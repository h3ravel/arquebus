import HasOneOrMany from './has-one-or-many'
import Relation from './relation'
import SupportsDefaultModels from './concerns/supports-default-models'
import { compose } from '../utils'
class HasOne extends compose(Relation, HasOneOrMany, SupportsDefaultModels) {
  foreignKey
  localKey
  constructor(query, parent, foreignKey, localKey) {
    super(query, parent)
    this.foreignKey = foreignKey
    this.localKey = localKey
    this.addConstraints()
    return this.asProxy()
  }
  initRelation (models, relation) {
    models.map(model => {
      model.setRelation(relation, this.getDefaultFor(model))
    })
    return models
  }
  matchOne (models, results, relation) {
    return this.matchOneOrMany(models, results, relation, 'one')
  }
  getForeignKeyName () {
    const segments = this.foreignKey.split('.')
    return segments.pop()
  }
  async getResults () {
    if (this.getParentKey() === null) {
      return this.getDefaultFor(this.parent)
    }
    const results = await this.query.first()
    return results || this.getDefaultFor(this.parent)
  }
  match (models, results, relation) {
    return this.matchOneOrMany(models, results, relation, 'one')
  }
  addEagerConstraints (models) {
    this.query.whereIn(this.foreignKey, this.getKeys(models, this.localKey))
  }
  newRelatedInstanceFor (parent) {
    return this.related.newInstance().setAttribute(this.getForeignKeyName(), parent[this.localKey])
  }
}
export default HasOne

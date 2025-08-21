import { Model } from '../model'
import Relation from './relation'
import SupportsDefaultModels from './concerns/supports-default-models'
import { compose } from '../utils'

class BelongsTo extends compose(Relation, SupportsDefaultModels) {
  foreignKey
  ownerKey
  child
  relationName
  constructor(query, child, foreignKey, ownerKey, relationName) {
    super(query, child)
    this.foreignKey = foreignKey
    this.ownerKey = ownerKey
    this.child = child
    this.relationName = relationName
    this.addConstraints()
    return this.asProxy()
  }
  async getResults () {
    if (this.child[this.foreignKey] === null) {
      return this.getDefaultFor(this.parent)
    }
    const result = await this.query.first()
    return result || this.getDefaultFor(this.parent)
  }
  match (models, results, relation) {
    const foreign = this.foreignKey
    const owner = this.ownerKey
    const dictionary = {}
    results.map(result => {
      const attribute = result.attributes[owner]
      dictionary[attribute] = result
    })
    models.map(model => {
      const attribute = model[foreign]
      if (dictionary[attribute] !== undefined) {
        model.setRelation(relation, dictionary[attribute])
      }
    })
    return models
  }
  getQualifiedForeignKeyName () {
    return this.child.qualifyColumn(this.foreignKey)
  }
  getRelationExistenceQuery (query, parentQuery, columns = ['*']) {
    if (parentQuery.getQuery()._single.table == query.getQuery()._single.table) {
      return this.getRelationExistenceQueryForSelfRelation(query, parentQuery, columns)
    }
    return query.select(columns).whereColumn(this.getQualifiedForeignKeyName(), '=', query.qualifyColumn(this.ownerKey))
  }
  getRelationExistenceQueryForSelfRelation (query, parentQuery, columns = ['*']) {
    const hash = this.getRelationCountHash()
    query.select(columns).from(query.getModel().getTable() + ' as ' + hash)
    query.getModel().setTable(hash)
    return query.whereColumn(hash + '.' + this.ownerKey, '=', this.getQualifiedForeignKeyName())
  }
  initRelation (models, relation) {
    models.map(model => {
      model.setRelation(relation, this.getDefaultFor(model))
    })
    return models
  }
  addEagerConstraints (models) {
    const key = `${this.related.getTable()}.${this.ownerKey}`
    // const whereIn = this.whereIn(this.related, this.ownerKey);
    this.query.whereIn(key, this.getEagerModelKeys(models))
  }
  getEagerModelKeys (models) {
    const keys = []
    models.map(model => {
      const value = model[this.foreignKey]
      if (value !== null && value !== undefined) {
        keys.push(value)
      }
    })
    keys.sort()
    return [...new Set(keys)]
  }
  associate (model) {
    const ownerKey = model instanceof Model ? model.attributes[this.ownerKey] : model
    this.child[this.foreignKey] = ownerKey
    if (model instanceof Model) {
      this.child.setRelation(this.relationName, model)
    }
    else {
      this.child.unsetRelation(this.relationName)
    }
    return this.child
  }
  dissociate () {
    this.child[this.foreignKey] = null
    return this.child.setRelation(this.relationName, null)
  }
  addConstraints () {
    if (this.constructor.constraints) {
      const table = this.related.getTable()
      this.query.where(table + '.' + this.ownerKey, '=', this.child[this.foreignKey])
    }
  }
  newRelatedInstanceFor (parent) {
    return this.related.newInstance()
  }
}
export default BelongsTo

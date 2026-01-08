import { Model } from '../model'
import Relation from './relation'
import SupportsDefaultModels from './concerns/supports-default-models'
import { compose } from '../utils'

class BelongsTo extends compose(Relation, SupportsDefaultModels) {
  foreignKey?: string
  ownerKey?: string
  child: Model
  relationName?: string

  constructor(
    query: any,
    child: Model,
    foreignKey?: string,
    ownerKey?: string,
    relationName?: string,
  ) {
    super(query, child)
    this.foreignKey = foreignKey
    this.ownerKey = ownerKey
    this.child = child
    this.relationName = relationName
    this.addConstraints()
    return this.asProxy()
  }

  async getResults (): Promise<Model | null> {
    if (this.child[this.foreignKey!] == null) {
      return this.getDefaultFor(this.parent)
    }
    const result: Model | null = (await this.query.first())!
    return result || this.getDefaultFor(this.parent)
  }

  match (models: Model[], results: Model[], relation: string): Model[] {
    const foreign = this.foreignKey as string
    const owner = this.ownerKey as string
    const dictionary: Record<string | number, Model> = {}

    results.map((result) => {
      const attribute = result.attributes[owner]
      dictionary[attribute] = result
    })
    models.map((model) => {
      const attribute = model[foreign]
      if (dictionary[attribute] !== undefined) {
        model.setRelation(relation, dictionary[attribute])
      }
    })
    return models
  }

  getQualifiedForeignKeyName (): string {
    return this.child.qualifyColumn(this.foreignKey as string)
  }

  getRelationExistenceQuery (
    query: any,
    parentQuery: any,
    columns: string[] = ['*'],
  ): any {
    if (
      parentQuery.getQuery()._single.table === query.getQuery()._single.table
    ) {
      return this.getRelationExistenceQueryForSelfRelation(
        query,
        parentQuery,
        columns,
      )
    }

    return query
      .select(columns)
      .whereColumn(
        this.getQualifiedForeignKeyName(),
        '=',
        query.qualifyColumn(this.ownerKey as string),
      )
  }

  getRelationExistenceQueryForSelfRelation (
    query: any,
    parentQuery: any,
    columns: string[] = ['*'],
  ): any {
    const hash = this.getRelationCountHash()
    query.select(columns).from(query.getModel().getTable() + ' as ' + hash)
    query.getModel().setTable(hash)

    return query.whereColumn(
      `${hash}.${this.ownerKey}`,
      '=',
      this.getQualifiedForeignKeyName(),
    )
  }

  initRelation (models: Model[], relation: string): Model[] {
    models.forEach((model) => {
      model.setRelation(relation, this.getDefaultFor(model))
    })
    return models
  }

  addEagerConstraints (models: Model[]): void {
    const key = `${this.related.getTable()}.${this.ownerKey}`
    // const whereIn = this.whereIn(this.related, this.ownerKey);
    this.query.whereIn(key, this.getEagerModelKeys(models))
  }

  getEagerModelKeys (models: Model[]): (string | number)[] {
    const keys: (string | number)[] = []

    models.forEach((model) => {
      const value = model[this.foreignKey as string]
      if (value !== null && value !== undefined) {
        keys.push(value)
      }
    })

    keys.sort()
    return [...new Set(keys)]
  }

  associate (model: Model | string | number): Model {
    const ownerKey =
      model instanceof Model ? model.attributes[this.ownerKey as string] : model

    this.child[this.foreignKey as string] = ownerKey

    if (model instanceof Model) {
      this.child.setRelation(this.relationName as string, model)
    } else {
      this.child.unsetRelation(this.relationName as string)
    }
    return this.child
  }

  dissociate (): Model {
    this.child[this.foreignKey as string] = null
    return this.child.setRelation(this.relationName as string, null)
  }

  addConstraints (this: any): void {
    if (this.constructor.constraints) {
      const table = this.related.getTable()
      this.query.where(
        `${table}.${this.ownerKey}`,
        '=',
        this.child[this.foreignKey as string],
      )
    }
  }

  newRelatedInstanceFor (_parent: any): Model {
    return this.related.newInstance()
  }
}
export default BelongsTo

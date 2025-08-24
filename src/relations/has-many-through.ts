import type { TFunction, TGeneric } from 'types/generics'

import type { Builder } from 'src/builder'
import type { Model } from 'src/model'
import { ModelNotFoundError } from 'src/errors'
import Relation from './relation'
import { isArray } from 'radashi'
import { tap } from 'src/utils'

class HasManyThrough extends Relation {
  throughParent: any
  farParent: any
  firstKey?: string
  secondKey?: string
  localKey?: string
  secondLocalKey?: string

  constructor(
    query: Builder,
    farParent: any,
    throughParent: any,
    firstKey?: string,
    secondKey?: string,
    localKey?: string,
    secondLocalKey?: string
  ) {
    super(query, throughParent)
    this.localKey = localKey
    this.firstKey = firstKey
    this.secondKey = secondKey
    this.farParent = farParent
    this.throughParent = throughParent
    this.secondLocalKey = secondLocalKey
    return this.asProxy()
  }

  addConstraints () {
    const localValue = this.farParent[this.localKey!]
    this.performJoin()
    if ((this as any).constructor.constraints) {
      (this as any).query.where(this.getQualifiedFirstKeyName(), '=', localValue)
    }
  }

  performJoin (query: any | null = null) {
    query = query! || this.query

    const farKey = this.getQualifiedFarKeyName()

    query.join(this.throughParent.getTable(), this.getQualifiedParentKeyName(), '=', farKey)
    if (this.throughParentSoftDeletes()) {
      query.withGlobalScope('SoftDeletableHasManyThrough', (query: any) => {
        query.whereNull(this.throughParent.getQualifiedDeletedAtColumn())
      })
    }
  }
  getQualifiedParentKeyName () {
    return this.parent.qualifyColumn(this.secondLocalKey)
  }
  throughParentSoftDeletes () {
    return this.throughParent.pluginInitializers['SoftDeletes'] !== undefined
  }
  withTrashedParents () {
    (this as any).query.withoutGlobalScope('SoftDeletableHasManyThrough')
    return this
  }
  addEagerConstraints (models: Model[]) {
    const whereIn = this.whereInMethod(this.farParent, this.localKey!)
    this.whereInEager(whereIn, this.getQualifiedFirstKeyName(), this.getKeys(models, this.localKey))
  }

  initRelation (models: Model[], relation: string) {
    for (const model of models) {
      model.setRelation(relation, this.related.newCollection())
    }
    return models
  }

  match (models: Model[], results: any, relation: string) {
    const dictionary = this.buildDictionary(results)
    for (const model of models) {
      const key = (this as any).getDictionaryKey(model.getAttribute(this.localKey))
      if (dictionary[key] !== undefined) {
        model.setRelation(relation, this.related.newCollection(dictionary[key]))
      }
    }
    return models
  }

  buildDictionary (results: any) {
    const dictionary: TGeneric = {}
    for (const result of results) {
      if (dictionary[result.laravel_through_key] === undefined) {
        dictionary[result.laravel_through_key] = []
      }
      dictionary[result.laravel_through_key].push(result)
    }
    return dictionary
  }

  async firstOrNew (this: any, attributes: TGeneric) {
    const instance = await this.where(attributes).first()
    return instance || this.related.newInstance(attributes)
  }

  async updateOrCreate (this: any, attributes: TGeneric, values = {}) {
    return tap(await this.firstOrCreate(attributes, values), async (instance) => {
      if (!instance.wasRecentlyCreated) {
        await instance.fill(values).save()
      }
    })
  }
  async firstWhere (this: any, column: string, operator = null, value = null, boolean = 'and') {
    return await this.where(column, operator, value, boolean).first()
  }
  async first (this: any, columns = ['*']) {
    const results = await this.take(1).get(columns)
    return results.count() > 0 ? results.first() : null
  }
  async firstOrFail (columns = ['*']) {
    const model = await this.first(columns)
    if (model) {
      return model
    }
    throw (new ModelNotFoundError).setModel(this.related.constructor)
  }
  async firstOr (columns = ['*'], callback: TFunction | null = null) {
    if (typeof columns === 'function') {
      callback = columns
      columns = ['*']
    }
    const model = await this.first(columns)
    if (model) {
      return model
    }
    return callback?.()
  }
  async find (this: any, id: string | number, columns = ['*']) {
    if (isArray(id)) {
      return await this.findMany(id, columns)
    }
    return await this.where(this.getRelated().getQualifiedKeyName(), '=', id).first(columns)
  }

  async findMany (this: any, ids: (string | number)[], columns = ['*']) {
    if (ids.length === 0) {
      return this.getRelated().newCollection()
    }
    return await this.whereIn(this.getRelated().getQualifiedKeyName(), ids).get(columns)
  }

  async findOrFail (id: string | number, columns = ['*']) {
    const result = await this.find(id, columns)
    if (Array.isArray(id)) {
      if (result.count() === id.length) {
        return result
      }
    }
    else if (result) {
      return result
    }
    throw (new ModelNotFoundError).setModel(this.related.constructor, id as any)
  }

  async getResults () {
    return this.farParent[this.localKey!]
      ? await this.get()
      : this.related.newCollection()
  }

  async get (columns = ['*']) {
    const builder = this.prepareQueryBuilder(columns)
    let models = await builder.getModels()
    if (models.count() > 0) {
      models = await builder.eagerLoadRelations(models)
    }
    return this.related.newCollection(models)
  }

  async paginate (this: any, perPage: number | null = null, columns = ['*'], pageName = 'page', page = null) {
    this.query.addSelect(this.shouldSelect(columns))
    return await this.query.paginate(perPage, columns, pageName, page)
  }

  shouldSelect (columns = ['*']) {
    if (columns?.at(0) == '*') {
      columns = [this.related.getTable() + '.*']
    }
    return [...columns, this.getQualifiedFirstKeyName() + ' as laravel_through_key']
  }

  async chunk (count: number, callback: TFunction) {
    return await this.prepareQueryBuilder().chunk(count, callback)
  }

  prepareQueryBuilder (this: any, columns = ['*']) {
    const builder = this.query.applyScopes()
    return builder.addSelect(this.shouldSelect(builder.getQuery().columns ? [] : columns))
  }

  getRelationExistenceQuery (query: Builder, parentQuery: Builder, columns = ['*']) {
    if (parentQuery.getQuery().from === query.getQuery().from) {
      return this.getRelationExistenceQueryForSelfRelation(query, parentQuery, columns)
    }
    if (parentQuery.getQuery().from === this.throughParent.getTable()) {
      return this.getRelationExistenceQueryForThroughSelfRelation(query, parentQuery, columns)
    }
    this.performJoin(query)
    return (query as any).select(columns).where(this.getQualifiedLocalKeyName(), '=', this.getQualifiedFirstKeyName())
  }

  getRelationExistenceQueryForSelfRelation (query: Builder, parentQuery: Builder, columns = ['*']) {
    const hash = this.getRelationCountHash();
    (query as any).from(query.getModel().getTable() + ' as ' + hash);
    (query as any).join(this.throughParent.getTable(), this.getQualifiedParentKeyName(), '=', hash + '.' + this.secondKey)
    if (this.throughParentSoftDeletes()) {
      (query as any).whereNull(this.throughParent.getQualifiedDeletedAtColumn())
    }
    query.getModel().setTable(hash)

    return (query as any).select(columns).whereColumn(parentQuery.getQuery().from + '.' + this.localKey, '=', this.getQualifiedFirstKeyName())
  }

  getRelationExistenceQueryForThroughSelfRelation (query: Builder, parentQuery: Builder, columns = ['*']) {
    const hash = this.getRelationCountHash()
    const table = this.throughParent.getTable() + ' as ' + hash;

    (query as any).join(table, hash + '.' + this.secondLocalKey, '=', this.getQualifiedFarKeyName())
    if (this.throughParentSoftDeletes()) {
      (query as any).whereNull(hash + '.' + this.throughParent.getDeletedAtColumn())
    }
    return (query as any).select(columns).where(parentQuery.getQuery().from + '.' + this.localKey, '=', hash + '.' + this.firstKey)
  }

  getQualifiedFarKeyName () {
    return this.getQualifiedForeignKeyName()
  }

  getFirstKeyName () {
    return this.firstKey
  }

  getQualifiedFirstKeyName () {
    return this.throughParent.qualifyColumn(this.firstKey)
  }

  getForeignKeyName () {
    return this.secondKey
  }
  getQualifiedForeignKeyName () {
    return this.related.qualifyColumn(this.secondKey)
  }
  getLocalKeyName () {
    return this.localKey
  }
  getQualifiedLocalKeyName () {
    return this.farParent.qualifyColumn(this.localKey)
  }
  getSecondLocalKeyName () {
    return this.secondLocalKey
  }
}
export default HasManyThrough

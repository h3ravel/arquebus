import { compose, tap } from '../utils'
import { isEqual, omit } from 'radashi'

import Collection from '../collection'
import InteractsWithPivotTable from './concerns/interacts-with-pivot-table'
import type { Model } from 'src/model'
import { ModelNotFoundError } from '../errors'
import Relation from './relation'
import type { TGeneric } from 'types/generics'
import { collect } from 'collect.js'

class BelongsToMany extends compose(Relation, InteractsWithPivotTable) {
  table?: string
  foreignPivotKey?: string
  relatedPivotKey?: string
  parentKey?: string
  relatedKey?: string
  pivotColumns: any[] = []
  pivotValues: any[] = []
  pivotWheres: any[] = []
  pivotWhereIns: any[] = []
  pivotWhereNulls: any[] = []
  accessor: string = 'pivot'
  using!: Model
  pivotCreatedAt?: string | null
  pivotUpdatedAt?: string | null

  constructor(
    query: any,
    parent: any,
    table?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    parentKey?: string,
    relatedKey?: string
  ) {
    super(query, parent)
    this.table = table
    this.foreignPivotKey = foreignPivotKey
    this.relatedPivotKey = relatedPivotKey
    this.parentKey = parentKey
    this.relatedKey = relatedKey
    this.addConstraints()
    return this.asProxy()
  }

  initRelation (models: any[], relation: string): any[] {
    models.map(model => {
      model.setRelation(relation, new Collection([]))
    })
    return models
  }

  addConstraints (): void {
    this.performJoin()
    if ((this.constructor as any).constraints) {
      this.addWhereConstraints()
    }
  }

  performJoin (query: any = null): this {
    query = query || this.query
    query.join(
      this.getTable(),
      this.getQualifiedRelatedKeyName(),
      '=',
      this.qualifyPivotColumn(this.relatedPivotKey as string)
    )
    return this
  }

  getTable (): string | undefined {
    return this.table
  }

  getQualifiedRelatedKeyName (): string {
    return this.related.qualifyColumn(this.relatedKey)
  }

  async getResults (): Promise<any> {
    return this.parent[this.parentKey as string] !== null
      ? await this.get()
      : new Collection([])
  }

  addWhereConstraints (): this {
    (this as any).query.where(
      this.getQualifiedForeignPivotKeyName(),
      '=',
      this.parent[this.parentKey as string]
    )
    return this
  }

  async get (columns?: string[]) {
    const builder = (this as any).query.applyScopes()
    columns = builder.query?._statements?.find((item: any) => item.grouping == 'columns')
      ? []
      : columns

    let models: any[] = await builder.select(this.shouldSelect(columns)).getModels()
    this.hydratePivotRelation(models)
    if (models.length > 0) {
      models = await builder.eagerLoadRelations(models)
    }
    return new Collection(models)
  }

  async first (columns: string[] = ['*']): Promise<any | null> {
    const results = await this.take(1).get(columns)
    return results.count() > 0 ? results.first() : null
  }

  async firstOrFail (...columns: any[]): Promise<any> {
    const model = await this.first(...columns)
    if (model !== null) {
      return model
    }
    throw new ModelNotFoundError().setModel(this.related.constructor)
  }

  async paginate (page: number = 1, perPage: number = 15, columns: string[] = ['*']): Promise<any> {
    (this as any).query.select(this.shouldSelect(columns))
    return tap(await this.query.paginate(page, perPage), (paginator: any) => {
      this.hydratePivotRelation(paginator.items())
    })
  }

  async chunk (count: number, callback: (results: any, page: number) => Promise<any>): Promise<any> {
    return await this.prepareQueryBuilder().chunk(count, async (results: any, page: number) => {
      this.hydratePivotRelation(results.all())
      return await callback(results, page)
    })
  }

  setUsing (model: Model): this {
    this.using = model
    return this
  }

  as (accessor: string): this {
    this.accessor = accessor
    return this
  }

  prepareQueryBuilder (): any {
    return (this as any).query.select(this.shouldSelect())
  }

  hydratePivotRelation (models: any[]): void {
    models.map(model => {
      model.setRelation(
        this.accessor,
        this.newExistingPivot(this.migratePivotAttributes(model))
      )
    })
  }

  migratePivotAttributes (model: any): Record<string, any> {
    const values: Record<string, any> = {}
    for (const key in model.attributes) {
      const value = model.attributes[key]
      if (key.startsWith('pivot_')) {
        values[key.substring(6)] = value
        model.attributes = omit(model.attributes, [key])
      }
    }
    return values
  }

  withTimestamps (createdAt: string | null = null, updatedAt: string | null = null): this {
    this.pivotCreatedAt = createdAt
    this.pivotUpdatedAt = updatedAt
    return this.withPivot(this.createdAt(), this.updatedAt())
  }

  shouldSelect (columns: string[] = ['*']): string[] {
    if (isEqual(columns, ['*'])) {
      columns = [this.related.getTable() + '.*']
    }
    return columns.concat(this.aliasedPivotColumns())
  }

  aliasedPivotColumns (): string[] {
    const defaults = [this.foreignPivotKey, this.relatedPivotKey]
    return collect(defaults.concat(this.pivotColumns))
      .map((column: any) => {
        return this.qualifyPivotColumn(column) + ' as pivot_' + column
      })
      .unique()
      .all()
  }

  qualifyPivotColumn (column: string): string {
    return column.includes('.')
      ? column
      : this.getTable() + '.' + column
  }

  match (models: any[], results: any[], relation: string): any[] {
    const dictionary = this.buildDictionary(results)
    models.map(model => {
      const key = model.getKey()
      if (dictionary[key] !== undefined) {
        model.setRelation(relation, dictionary[key])
      }
    })
    return models
  }

  buildDictionary (results: any[]) {
    const dictionary: TGeneric<Collection<any>> = {}
    results.map(result => {
      const value = result[this.accessor][this.foreignPivotKey as string]
      if (dictionary[value] === undefined) {
        dictionary[value] = new Collection<any>([])
      }
      dictionary[value].push(result)
    })
    return dictionary
  }

  addEagerConstraints (models: any[]): void {
    (this as any).query.whereIn(
      this.getQualifiedForeignPivotKeyName(),
      this.getKeys(models, this.parentKey)
    )
  }

  getQualifiedForeignPivotKeyName (): string {
    return this.qualifyPivotColumn(this.foreignPivotKey as string)
  }

  getQualifiedRelatedPivotKeyName (): string {
    return this.qualifyPivotColumn(this.relatedPivotKey as string)
  }

  wherePivot (column: string, operator: any = null, value: any = null, boolean: string = 'and'): any {
    // eslint-disable-next-line prefer-rest-params
    this.pivotWheres.push(Array.prototype.slice.call(arguments))
    return this.where(this.qualifyPivotColumn(column), operator, value, boolean)
  }

  wherePivotBetween (column: string, values: any, boolean: string = 'and', not: boolean = false): any {
    return this.whereBetween(this.qualifyPivotColumn(column), values, boolean, not)
  }

  orWherePivotBetween (column: string, values: any): any {
    return this.wherePivotBetween(column, values, 'or')
  }

  wherePivotNotBetween (column: string, values: any, boolean: string = 'and'): any {
    return this.wherePivotBetween(column, values, boolean, true)
  }

  orWherePivotNotBetween (column: string, values: any): any {
    return this.wherePivotBetween(column, values, 'or', true)
  }

  wherePivotIn (column: string, values: any, boolean: string = 'and', not: boolean = false): any {
    return this.whereIn(this.qualifyPivotColumn(column), values, boolean, not)
  }

  orWherePivot (column: string, operator: any = null, value: any = null): any {
    return this.wherePivot(column, operator, value, 'or')
  }

  orWherePivotIn (column: string, values: any): any {
    return this.wherePivotIn(column, values, 'or')
  }

  wherePivotNotIn (column: string, values: any, boolean: string = 'and'): any {
    return this.wherePivotIn(column, values, boolean, true)
  }

  orWherePivotNotIn (column: string, values: any): any {
    return this.wherePivotNotIn(column, values, 'or')
  }

  wherePivotNull (column: string, boolean: string = 'and', not: boolean = false): any {
    return this.whereNull(this.qualifyPivotColumn(column), boolean, not)
  }

  wherePivotNotNull (column: string, boolean: string = 'and'): any {
    return this.wherePivotNull(column, boolean, true)
  }

  orWherePivotNull (column: string, not: boolean = false): any {
    return this.wherePivotNull(column, 'or', not)
  }

  orWherePivotNotNull (column: string): any {
    return this.orWherePivotNull(column, true)
  }

  orderByPivot (column: string, direction: string = 'asc'): any {
    return this.orderBy(this.qualifyPivotColumn(column), direction)
  }

  createdAt (): string {
    return this.pivotCreatedAt || this.parent.getCreatedAtColumn()
  }

  updatedAt (): string {
    return this.pivotUpdatedAt || this.parent.getUpdatedAtColumn()
  }

  getExistenceCompareKey (): string {
    return this.getQualifiedForeignPivotKeyName()
  }

  getRelationExistenceQuery (query: any, parentQuery: any, columns: string[] = ['*']): any {
    if (parentQuery.getQuery()._single.table == query.getQuery()._single.table) {
      return this.getRelationExistenceQueryForSelfJoin(query, parentQuery, columns)
    }
    this.performJoin(query)
    return super.getRelationExistenceQuery(query, parentQuery, columns)
  }

  getRelationExistenceQueryForSelfJoin (query: any, parentQuery: any, columns: string[] = ['*']): any {
    const hash = this.getRelationCountHash()
    query.select(columns).from(this.related.getTable() + ' as ' + hash)
    this.related.setTable(hash)
    this.performJoin(query)
    return super.getRelationExistenceQuery(query, parentQuery, columns)
  }
}

export default BelongsToMany

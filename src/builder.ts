import { ModelNotFoundError, RelationNotFoundError } from './errors'
import type { TFunction, TGeneric } from 'types/generics'
import { diff as difference, flat as flatten, isArray, isString, assign as merge, omit, snake } from 'radashi'
import { flattenDeep, getRelationMethod, getScopeMethod, tap } from './utils'

import type BModel from 'src/browser/model'
import { Collection as BaseCollection } from 'collect.js'
import BelongsToMany from './relations/belongs-to-many'
import Collection from './collection'
import type { IBuilder } from 'types/builder'
import type { ICollection } from 'types/utils'
import type { IModel } from 'types/modeling'
import type Model from 'src/model'
import Paginator from './paginator'
import Relation from './relations/relation'
import Scope from './scope'

const Inference = class { } as { new <M extends Model | BModel = Model, R = IModel | ICollection<M>>(): IBuilder<M, R> }

export class Builder<M extends Model = Model, R = IModel | ICollection<M>> extends Inference {
  query: IBuilder<M, R>
  connection: any
  model!: M
  actions!: any[]
  localMacros: TGeneric<(...args: any[]) => any, keyof Omit<IBuilder<M, R>, number>> = {}
  eagerLoad: TGeneric<(...args: any[]) => any> = {}
  globalScopes: TGeneric<Scope<M> | ((arg: Builder<M, R>) => Builder<M, R>)> = {}
  onDeleteCallback?: (builder: Builder<M, R>) => Promise<boolean | number>

  constructor(query: IBuilder<M, R>) {
    super()

    this.query = query
    return this.asProxy() as unknown as Builder<M, R>
  }
  asProxy (): Builder<M, R> {
    const handler = {
      get (target: Builder<M, R>, prop: string) {
        if (typeof target[prop] !== 'undefined') {
          return target[prop]
        }

        const skipReturning = !!target.query.connector?.client.config?.client?.includes('mysql') && prop === 'returning'

        if ([
          'select', 'from', 'where', 'orWhere', 'whereColumn', 'whereRaw',
          'whereNot', 'orWhereNot', 'whereIn', 'orWhereIn', 'whereNotIn', 'orWhereNotIn', 'whereNull', 'orWhereNull', 'whereNotNull', 'orWhereNotNull', 'whereExists', 'orWhereExists',
          'whereNotExists', 'orWhereNotExists', 'whereBetween', 'orWhereBetween', 'whereNotBetween', 'orWhereNotBetween',
          'whereLike', 'orWhereLike', 'whereILike', 'orWhereILike',
          'whereJsonObject', 'whereJsonPath', 'whereJsonSupersetOf', 'whereJsonSubsetOf',
          'join', 'joinRaw', 'leftJoin', 'leftOuterJoin', 'rightJoin', 'rightOuterJoin', 'crossJoin',
          'transacting', 'groupBy', 'groupByRaw', 'returning',
          'having', 'havingRaw', 'havingBetween',
          'limit', 'offset', 'orderBy', 'orderByRaw', // 'inRandomOrder',
          'union', 'insert', 'forUpdate', 'forShare', 'distinct',
          'clearOrder', 'clear', 'clearSelect', 'clearWhere', 'clearHaving', 'clearGroup',
        ].includes(prop) && !skipReturning) {
          return (...args: any[]) => {
            target.query[prop](...args)
            return target.asProxy()
          }
        }

        if ([
          'avg', 'max', 'min', 'sum', 'count',
        ].includes(prop)) {
          return (column: string) => {
            const instance = target.asProxy()
            instance.applyScopes()
            column = !column && prop === 'count' ? '*' : column
            return instance.query[prop](column)
          }
        }
        if (typeof prop === 'string') {
          if (target.hasMacro(prop)) {
            const instance = target.asProxy()
            return (...args: any[]) => {
              return instance.localMacros[prop](instance, ...args)
            }
          }
          if (target.hasNamedScope(prop)) {
            const instance = target.asProxy()
            return (...args: any[]) => {
              instance.callNamedScope(prop, args)
              return instance
            }
          }
          if (prop.startsWith('where')) {
            const column = snake(prop.substring(5))
            return (...args: any[]) => {
              (target as any).query.where(column, ...args)
              return target.asProxy()
            }
          }
        }
      },
    }

    return new Proxy(this, handler) as any
  }
  orWhere (...args: any[]) {
    if (typeof args[0] === 'function') {
      const callback = args[0]
      this.query.orWhere((query: any) => {
        this.query = query
        callback(this)
      })
      return this
    }
    this.query.orWhere(...(args as Parameters<typeof this.query.orWhere>))
    return this
  }
  async chunk<C extends TFunction> (count: number, callback: C) {
    let page = 1
    let countResults
    do {
      this.enforceOrderBy()
      const builder = this.clone()
      const results = await builder.forPage(page, count).get()
      countResults = results.count()
      if (countResults == 0) {
        break
      }
      const bool = await callback(results, page)
      if (bool === false) {
        return false
      }
      page++
    } while (countResults === count)
    return true
  }
  enforceOrderBy (this: any) {
    if (this.query._statements.filter((item: any) => item.grouping === 'order').length === 0) {
      this.orderBy(this.model.getQualifiedKeyName(), 'asc')
    }
  }
  clone (this: any) {
    const query = this.query.clone()
    const builder = new this.constructor(query)
    builder.connection = this.connection
    builder.setModel(this.model)
    builder.globalScopes = { ...this.globalScopes }
    builder.localMacros = { ...this.localMacros }
    builder.eagerLoad = { ...this.eagerLoad }
    return builder
  }
  forPage (this: any, page: number, perPage = 15) {
    return this.offset((page - 1) * perPage).limit(perPage)
  }
  insert (...args: Parameters<typeof this.query.insert>) {
    return this.query.insert(...args)
  }
  update<T extends TGeneric> (values: T) {
    this.applyScopes()
    return this.query.update(this.addUpdatedAtColumn(values))
  }
  increment (column: string, amount = 1, extra = {}) {
    this.applyScopes()
    const db = this.model.getConnection()
    return this.query.update(this.addUpdatedAtColumn({
      ...extra,
      [column]: db.raw(`${column} + ${amount}`),
    }))
  }
  decrement (column: string, amount = 1, extra = {}) {
    this.applyScopes()
    const db = this.model.getConnection()
    return this.query.update(this.addUpdatedAtColumn({
      ...extra,
      [column]: db.raw(`${column} - ${amount}`),
    }))
  }
  addUpdatedAtColumn (values: TGeneric<string>) {
    if (!this.model.usesTimestamps()
      || this.model.getUpdatedAtColumn() === null) {
      return values
    }
    const column = this.model.getUpdatedAtColumn()
    values = merge({ [column]: this.model.freshTimestampString() }, values)
    return values
  }
  delete () {
    if (this.onDeleteCallback) {
      return this.onDeleteCallback(this)
    }
    return this.query.delete()
  }
  onDelete<C extends TFunction<any, Promise<number | boolean>>> (callback: C) {
    this.onDeleteCallback = callback
  }
  forceDelete () {
    return this.query.delete()
  }
  async create (attributes = {}) {
    return await tap(this.newModelInstance(attributes), async (instance) => {
      await instance.save({
        client: this.query
      })
    })
  }
  newModelInstance (attributes = {}) {
    return this.model.newInstance(attributes).setConnection(this.model.getConnectionName())
  }
  getQuery () {
    return this.query
  }
  getModel () {
    return this.model
  }
  setModel<MO extends Model> (model: MO) {
    this.model = model as any

    if (typeof this.query?.client?.table == 'function') {
      this.query = this.query.client.table(this.model.getTable())
    }
    else {
      this.query = this.query.table(this.model.getTable()) as any
    }
    return this
  }
  qualifyColumn (column: string) {
    return this.model.qualifyColumn(column)
  }
  setTable (table: string) {
    this.query = this.query.table(table) as any
    return this
  }
  applyScopes () {
    if (!this.globalScopes) {
      return this
    }

    for (const identifier in this.globalScopes) {
      const scope = this.globalScopes[identifier]
      if (scope instanceof Scope) {
        scope.apply(this, this.getModel())
      }
      else {
        scope(this)
      }
    }
    return this
  }
  hasNamedScope (name: string) {
    return this.model && this.model.hasNamedScope(name)
  }
  callNamedScope (scope: string, parameters: any[]) {
    return this.model.callNamedScope(scope, [this, ...parameters])
  }
  callScope (scope: (builder: this, ...args: any[]) => this, parameters = []) {
    const result = scope(this, ...parameters) || this
    return result
  }
  scopes (scopes: string[]) {
    scopes.map(scopeName => {
      const scopeMethod = getScopeMethod(scopeName)
      if (typeof this.model[scopeMethod] === 'function') {
        this.globalScopes[scopeName] = this.model[scopeMethod]
      }
    })
    return this
  }
  withGlobalScope (identifier: string, scope: any) {
    this.globalScopes[identifier] = scope
    if (typeof scope.extend === 'function') {
      scope.extend(this)
    }
    return this
  }
  withoutGlobalScope (scope: Scope | string) {
    if (typeof scope !== 'string') {
      scope = scope.constructor.name as string
    }

    this.globalScopes = omit(this.globalScopes, [scope])
    return this
  }
  macro<N extends string> (
    name: N,
    callback: (builder: TGeneric & IBuilder<M>, attrs: any, vals: any) => any
  ): this {
    this.localMacros[name] = callback
    return this
  }
  hasMacro (name: string) {
    return name in this.localMacros
  }
  getMacro (name: string) {
    return this.localMacros[name]
  }
  with (...args: any[]) {
    let eagerLoads = {}
    if (typeof args[1] === 'function') {
      const eagerLoad = this.parseWithRelations({
        [args[0]]: args[1]
      })
      this.eagerLoad = merge(this.eagerLoad, eagerLoad)
      return this
    }
    const relations = flattenDeep(args)
    if (relations.length === 0) {
      return this
    }
    for (const relation of relations) {
      let eagerLoad
      if (typeof relation === 'string') {
        eagerLoad = {
          [relation]: (q: any) => q,
        }
      }
      else if (typeof relation === 'object') {
        eagerLoad = relation
      }
      eagerLoads = merge(eagerLoads, eagerLoad)
    }
    this.eagerLoad = merge(this.eagerLoad, this.parseWithRelations(eagerLoads))
    return this
  }
  has (relation: any, operator = '>=', count = 1, boolean = 'and', callback: TFunction | null = null): any {
    if (isString(relation)) {
      if (relation.includes('.')) {
        return this.hasNested(relation, operator, count, boolean, callback)
      }
      relation = this.getRelationWithoutConstraints(getRelationMethod(relation))
    }
    const method = this.canUseExistsForExistenceCheck(operator, count)
      ? 'getRelationExistenceQuery'
      : 'getRelationExistenceCountQuery'
    const hasQuery = relation[method](relation.getRelated().newModelQuery(), this)
    if (callback) {
      callback(hasQuery)
    }
    return this.addHasWhere(hasQuery, relation, operator, count, boolean)
  }
  orHas (relation: any, operator = '>=', count = 1) {
    return this.has(relation, operator, count, 'or')
  }
  doesntHave (relation: any, boolean = 'and', callback: TFunction | null = null) {
    return this.has(relation, '<', 1, boolean, callback)
  }
  orDoesntHave (relation: any) {
    return this.doesntHave(relation, 'or')
  }
  whereHas (relation: any, callback: TFunction | null = null, operator = '>=', count = 1) {
    return this.has(relation, operator, count, 'and', callback)
  }
  orWhereHas (relation: any, callback: TFunction | null = null, operator = '>=', count = 1) {
    return this.has(relation, operator, count, 'or', callback)
  }
  whereRelation (relation: any, ...args: any[]) {
    const column = args.shift()
    return this.whereHas(relation, (query) => {
      if (typeof column === 'function') {
        column(query)
      }
      else {
        query.where(column, ...args)
      }
    })
  }
  orWhereRelation (relation: any, ...args: any[]) {
    const column = args.shift()
    return this.orWhereHas(relation, function (query) {
      if (typeof column === 'function') {
        column(query)
      }
      else {
        query.where(column, ...args)
      }
    })
  }
  hasNested (relations: any, operator = '>=', count = 1, boolean = 'and', callback: TFunction | null = null) {
    relations = relations.split('.')
    const doesntHave = operator === '<' && count === 1
    if (doesntHave) {
      operator = '>='
      count = 1
    }
    const closure = (q: any) => {
      if (relations.length > 1) {
        q.whereHas(relations.shift(), closure)
      }
      else {
        q.has(relations.shift(), operator, count, 'and', callback)
      }
      return null
    }
    return this.has(relations.shift(), doesntHave ? '<' : '>=', 1, boolean, closure)
  }
  canUseExistsForExistenceCheck (operator: string, count: number) {
    return (operator === '>=' || operator === '<') && count === 1
  }
  addHasWhere (hasQuery: any, relation: any, operator: string, count: number, boolean: string) {
    hasQuery.mergeConstraintsFrom(relation.getQuery())
    return this.canUseExistsForExistenceCheck(operator, count)
      ? this.addWhereExistsQuery(hasQuery.getQuery(), boolean, operator === '<' && count === 1)
      : this.addWhereCountQuery(hasQuery.getQuery(), operator, count, boolean)
  }
  addWhereExistsQuery (this: any, query: any, boolean = 'and', not = false) {
    const type = not ? 'NotExists' : 'Exists'
    const method = boolean === 'and' ? 'where' + type : 'orWhere' + type
    this[method](query.connector)
    return this
  }
  addWhereCountQuery (this: any, query: any, operator = '>=', count = 1, boolean = 'and') {
    // this.query.addBinding(query.getBindings(), 'where');
    const db = this.model.getConnection()
    return this.where(db.raw('(' + query.toSQL().sql + ')'), operator, typeof count === 'number' ? db.raw(count) : count, boolean)
  }
  withAggregate (relations: any, column: string, action: string | null = null) {
    if (relations.length === 0) {
      return this
    }
    relations = flattenDeep([relations])
    let eagerLoads = {}
    for (const relation of relations) {
      let eagerLoad
      if (typeof relation === 'string') {
        eagerLoad = {
          [relation]: (q: any) => q,
        }
      }
      else if (typeof relation === 'object') {
        eagerLoad = relation
      }
      eagerLoads = merge(eagerLoads, eagerLoad)
    }
    relations = eagerLoads
    const db = this.model.getConnection()
    const columns = this.query._statements.filter(item => item.grouping == 'columns').map(item => item.value).flat()
    if (columns.length === 0) {
      this.query.select([this.query._single.table + '.*'])
    }
    const parses: TGeneric = this.parseWithRelations(relations)
    for (let name in parses) {
      const constraints = parses[name]
      const segments = name.split(' ')
      let alias, expression
      if (segments.length === 3 && segments[1].toLocaleLowerCase() === 'as') {
        [name, alias] = [segments[0], segments[2]]
      }
      const relation = this.getRelationWithoutConstraints(getRelationMethod(name))
      if (action) {
        const hashedColumn = this.query._single.table === relation.query.query._single.table
          ? `${relation.getRelationCountHash(false)}.${column}`
          : column
        const wrappedColumn = column === '*' ? column : relation.getRelated().qualifyColumn(hashedColumn)
        expression = action === 'exists' ? wrappedColumn : `${action}(${wrappedColumn})`
      }
      else {
        expression = column
      }
      const query = relation.getRelationExistenceQuery(relation.getRelated().newModelQuery(), this, db.raw(expression))
      constraints(query)
      alias = alias || snake(`${name} ${action} ${column}`.replace('/[^[:alnum:][:space:]_]/u', ''))
      if (action === 'exists') {
        (this as any).select(db.raw(`exists(${query.toSql().sql}) as ${alias}`))
      }
      else {
        this.selectSub(action ? query : query.limit(1), alias)
      }
    }
    return this
  }
  toSql () {
    const query = this.clone()
    query.applyScopes()
    return query.query.toSQL()
  }
  mergeConstraintsFrom (_from: any) {
    return this
    // const whereBindings = from.getQuery().getRawBindings()['where'] || []
    // const wheres = from.getQuery()._single.table !== this.getQuery()._single.table
    //   ? this.requalifyWhereTables(from.getQuery().wheres, from.getQuery().from, this.getModel().getTable()) : from.getQuery().wheres
    // return this.where([], [])
  }
  selectSub (query: Builder<M>, as: string) {
    const [querySub, bindings] = this.createSub(query)
    const db = this.model.getConnection()
    return (this as any).select(db.raw('(' + querySub + ') as ' + as, bindings))
  }
  createSub (query: any) {
    return this.parseSub(query)
  }
  parseSub (query: any) {
    if (query instanceof Builder || query instanceof Relation) {
      return [query.toSql().sql, query.toSql().bindings]
    }
    else if (isString(query)) {
      return [query, []]
    }
    else {
      throw new Error('A subquery must be a query builder instance, a Closure, or a string.')
    }
  }
  prependDatabaseNameIfCrossDatabaseQuery (query: any) {
    if (query.query._single.table !== this.query._single.table) {
      const databaseName = query.query._single.table
      if (!query.query._single.table.startsWith(databaseName) && !query.query._single.table.contains('.')) {
        query.from(databaseName + '.' + query.from)
      }
    }
    return query
  }
  getRelationWithoutConstraints (relation: string) {
    return Relation.noConstraints(() => {
      return this.getModel()[relation]()
    })
  }
  withCount (...args: any[]) {
    return this.withAggregate(flattenDeep(args), '*', 'count')
  }
  withMax (relation: any, column: string) {
    return this.withAggregate(relation, column, 'max')
  }
  withMin (relation: any, column: string) {
    return this.withAggregate(relation, column, 'min')
  }
  withAvg (relation: any, column: string) {
    return this.withAggregate(relation, column, 'avg')
  }
  withSum (relation: any, column: string) {
    return this.withAggregate(relation, column, 'sum')
  }
  withExists (relation: any) {
    return this.withAggregate(relation, '*', 'exists')
  }
  parseWithRelations (relations: TGeneric) {
    if (relations.length === 0) {
      return []
    }
    let results: TGeneric = {}
    const constraintsMap: TGeneric = this.prepareNestedWithRelationships(relations)
    for (const name in constraintsMap) {
      results = this.addNestedWiths(name, results)
      results[name] = constraintsMap[name]
    }
    return results
  }
  addNestedWiths (name: string, results: TGeneric) {
    const progress: string[] = []
    name.split('.').map(segment => {
      progress.push(segment)
      const last = progress.join('.')
      if (results[last] === undefined) {
        results[last] = () => { }
      }
    })
    return results
  }

  prepareNestedWithRelationships (relations: TGeneric, prefix = '') {
    let preparedRelationships: TGeneric = {}
    if (prefix !== '') {
      prefix += '.'
    }
    for (const key in relations) {
      const value = relations[key]

      if (isString(value) || Number.isFinite(parseInt(value))) {
        continue
      }
      const [attribute, attributeSelectConstraint] = this.parseNameAndAttributeSelectionConstraint(key, value)
      preparedRelationships = Object.assign({}, preparedRelationships, {
        [`${prefix}${attribute}`]: attributeSelectConstraint
      }, this.prepareNestedWithRelationships(value, `${prefix}${attribute}`))

      relations = omit(relations, [key])
    }

    for (const key in relations) {
      const value = relations[key]
      let attribute = key, attributeSelectConstraint = value
      if (isString(value)) {
        [attribute, attributeSelectConstraint] = (this as any).parseNameAndAttributeSelectionConstraint(value)
      }
      preparedRelationships[`${prefix}${attribute}`] = this.combineConstraints([
        attributeSelectConstraint,
        preparedRelationships[`${prefix}${attribute}`] || (() => { }),
      ])
    }
    return preparedRelationships
  }

  combineConstraints (constraints: TFunction[]) {
    return (builder: Builder<M>) => {
      constraints.map(constraint => {
        builder = constraint(builder) || builder
      })
      return builder
    }
  }

  parseNameAndAttributeSelectionConstraint (name: string, value: string) {
    return name.includes(':')
      ? this.createSelectWithConstraint(name)
      : [name, value]
  }

  createSelectWithConstraint (name: string) {
    return [name.split(':')[0], (query: any) => {
      query.select(name.split(':')[1].split(',').map((column) => {
        if (column.includes('.')) {
          return column
        }
        return query instanceof BelongsToMany
          ? query.related.getTable() + '.' + column
          : column
      }))
    }]
  }

  related (relation: string) {
    if (typeof this.model[getRelationMethod(relation)] !== 'function') {
      const message = `Model [${this.model.constructor.name}]'s relation [${relation}] doesn't exist.`
      throw new RelationNotFoundError(message)
    }
    return this.model[getRelationMethod(relation)]()
  }

  take (this: any, ...args: any[]) {
    return this.limit(...args)
  }

  skip (this: any, ...args: any[]) {
    return this.offset(...args)
  }

  async first (this: any, ...columns: any[]): Promise<M | null> {
    this.applyScopes()
    this.limit(1)
    let models = await this.getModels(columns)
    if (models.length > 0) {
      models = await this.eagerLoadRelations(models)
    }
    return models[0] || null
  }

  async firstOrFail (...columns: any[]): Promise<M> {
    const data = await this.first(...columns)
    if (data === null) {
      throw (new ModelNotFoundError).setModel(this.model.constructor.name as any)
    }
    return data as M
  }

  async findOrFail (this: any, ...args: any[]): Promise<M> {
    const data = await this.find(...args)
    if (isArray(args[0])) {
      if (data.count() !== args[0].length) {
        throw (new ModelNotFoundError).setModel(this.model.constructor.name as any, difference(args[0] as any, data.modelKeys()))
      }
      return data
    }
    if (data === null) {
      throw (new ModelNotFoundError).setModel(this.model.constructor.name as any, args[0])
    }
    return data
  }

  async findOrNew (id: string, columns: string[] = ['*']) {
    const model = await this.find(id, columns)
    if (model !== null) {
      return model
    }
    return this.newModelInstance()
  }

  async firstOrNew (this: any, attributes = {}, values = {}) {
    const instance = await this.where(attributes).first()
    if (instance !== null) {
      return instance
    }
    return this.newModelInstance(merge(attributes, values))
  }

  async firstOrCreate (this: any, attributes: TGeneric = {}, values = {}) {
    const instance = await this.where(attributes).first()
    if (instance !== null) {
      return instance
    }
    return tap(this.newModelInstance(merge(attributes, values)), async (instance) => {
      await instance.save({
        client: this.query
      })
    })
  }

  async updateOrCreate (attributes: TGeneric, values = {}) {
    return await tap(await this.firstOrNew(attributes), async (instance) => {
      await instance.fill(values).save({
        client: this.query
      })
    })
  }

  latest (column: string = 'id') {
    if (column === null) {
      column = this.model.getCreatedAtColumn() || 'created_at'
    }
    this.query.orderBy(column, 'desc')
    return this
  }
  oldest (column: string = 'id') {
    if (column === null) {
      column = this.model.getCreatedAtColumn() || 'created_at'
    }
    this.query.orderBy(column, 'asc')
    return this
  }
  async find (this: any, id: string | number | Collection<M>, columns?: string[]) {
    if (isArray(id) || id instanceof Collection) {
      return await this.findMany(id, columns)
    }
    return await this.where(this.model.getKeyName(), id).first(columns)
  }
  async findMany (this: any, ids: string[] | number[] | ICollection<any>, columns: string[] = ['*']) {
    if (ids instanceof Collection) {
      ids = ids.modelKeys()
    }
    ids = isArray(ids) ? ids : [ids] as any
    if (ids.length === 0) {
      return new Collection([])
    }
    return await this.whereIn(this.model.getKeyName(), ids).get(columns)
  }
  async pluck (column: string) {
    const data = await this.query.pluck(column)
    return new Collection(data) as any
  }
  async destroy (this: any, ids?: string | number | string[] | number[] | TFunction | Collection<M>) {
    if (ids instanceof Collection) {
      ids = ids.modelKeys()
    }
    if (ids instanceof BaseCollection) {
      ids = ids.all()
    }
    ids = isArray(ids) ? ids : Array.prototype.slice.call(ids)
    if (ids.length === 0) {
      return 0
    }
    const instance = this.model.newInstance()
    const key = instance.getKeyName()
    let count = 0
    const models = await this.model.newModelQuery().whereIn(key, ids).get()
    for (const model of models) {
      if (await model.delete()) {
        count++
      }
    }
    return count
  }
  async get<M extends Model> (columns: string | string[] = ['*']) {
    this.applyScopes()
    let models = await this.getModels(columns)
    if (models.length > 0) {
      models = await this.eagerLoadRelations(models)
    }
    return new Collection<M>(models)
  }
  async all (columns: string[] = ['*']) {
    return await this.model.newModelQuery().get(columns) as any
  }
  async paginate (this: any, page: number = 1, perPage: number = 10) {
    page = page || 1
    perPage = perPage || this?.model?.perPage || 15
    this.applyScopes()
    const query = this.query.clone()
    const total = await query.clearOrder().clearSelect().count(this.primaryKey)
    let results: any[] = []
    if (total > 0) {
      const skip = (page - 1) * (perPage ?? 10)
      this.take(perPage).skip(skip)
      results = await this.getModels()
      if (results.length > 0) {
        results = await this.eagerLoadRelations(results)
      }
    }
    else {
      results = []
    }
    return new Paginator(results, parseInt(total), perPage, page)
  }
  async getModels (...columns: any[]) {
    columns = flatten(columns)
    if (columns.length > 0) {
      if (this.query._statements.filter(item => item.grouping == 'columns').length == 0 && columns[0] !== '*') {
        this.query.select(...columns)
      }
    }
    return this.hydrate(await this.query.get()).all()
  }

  getRelation (name: string) {
    if (typeof this.model[getRelationMethod(name)] !== 'function') {
      const message = `Model [${this.model.constructor.name}]'s relation [${name}] doesn't exist.`
      throw new RelationNotFoundError(message)
    }
    const relation = Relation.noConstraints(() => (this.model.newInstance(this.model.attributes))[getRelationMethod(name)]())
    const nested = this.relationsNestedUnder(name)
    if (Object.keys(nested).length > 0) {
      relation.query.with(nested)
    }
    return relation.asProxy()
  }

  relationsNestedUnder (relation: string) {
    const nested: TGeneric = {}
    for (const name in this.eagerLoad) {
      const constraints = this.eagerLoad[name]
      if (this.isNestedUnder(relation, name)) {
        nested[name.substring((relation + '.').length)] = constraints
      }
    }
    return nested
  }

  isNestedUnder (relation: string, name: string) {
    return name.includes('.') && name.startsWith(relation + '.')
  }

  async eagerLoadRelation<M extends Model> (models: M[], name: string, constraints: any) {
    const relation = this.getRelation(name)
    relation.addEagerConstraints(models)
    constraints(relation)
    return relation.match(relation.initRelation(models, name), await relation.get(), name)
  }

  async eagerLoadRelations<M extends Model> (models: M[]) {
    for (const name in this.eagerLoad) {
      const constraints = this.eagerLoad[name]
      if (!name.includes('.')) {
        models = await this.eagerLoadRelation(models, name, constraints)
      }
    }
    return models
  }

  hydrate (items: any[] | ICollection<any>) {
    return new Collection(items.map(item => {
      if (!this.model) {
        return item
      }
      const model = this.model.newFromBuilder(item)
      return model
    }))
  }
}
export default Builder

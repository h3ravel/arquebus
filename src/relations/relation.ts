import type { QueryBuilder } from '../query-builder'

class Relation {
  query: QueryBuilder
  parent: any
  related: any
  eagerKeysWereEmpty: boolean = false
  static constraints: boolean = true
  static selfJoinCount: number = 0

  constructor(query: any, parent: any) {
    this.query = query
    this.parent = parent
    this.related = this.query.model
  }

  static extend (trait: Record<string, any>): void {
    for (const methodName in trait) {
      ; (this.prototype as any)[methodName] = trait[methodName]
    }
  }

  static noConstraints (callback: () => any): any {
    const previous = this.constraints
    this.constraints = false
    try {
      return callback()
    } finally {
      this.constraints = previous
    }
  }

  asProxy (): any {
    const handler: ProxyHandler<any> = {
      get: function (target, prop: string | symbol) {
        if (typeof (target as any)[prop] !== 'undefined') {
          return (target as any)[prop]
        }
        if (typeof prop === 'string') {
          if (typeof target.query[prop] === 'function') {
            return (...args: any[]) => {
              target.query[prop](...args)
              return target.asProxy()
            }
          }
        }
      },
    }
    return new Proxy(this, handler)
  }

  getRelated (): any {
    return this.related
  }

  getKeys (models: any[], key?: string | null): any[] {
    return models
      .map((model) => (key ? model.attributes[key] : model.getKey()))
      .sort()
  }

  getRelationQuery (): any {
    return this.query
  }

  whereInEager (
    whereIn: string,
    key: string,
    modelKeys: any[],
    query: any = null,
  ): void {
    ; (query || this.query)[whereIn](key, modelKeys)
    if (modelKeys.length === 0) {
      this.eagerKeysWereEmpty = true
    }
  }

  whereInMethod (model: any, key: string): string {
    return 'whereIn' // <- dead code below never runs, but keeping structure
    const segments = key.split('.')
    return model.getKeyName() === segments.pop() &&
      ['int', 'integer'].includes(model.getKeyType())
      ? 'whereIntegerInRaw'
      : 'whereIn'
  }

  getEager (): any {
    return this.eagerKeysWereEmpty
      ? (this as any).query.getModel().newCollection()
      : this.get()
  }

  async get (columns: string | string[] = ['*']): Promise<any> {
    return await (this as any).query.get(columns)
  }

  async first (columns: string[] = ['*']): Promise<any> {
    return await (this as any).query.first(columns)
  }

  async paginate (...args: any[]): Promise<any> {
    return await this.query.paginate(...args)
  }

  async count (...args: any[]): Promise<any> {
    return await (this as any).query.clearSelect().count(...args)
  }

  toSql (): string {
    return (this as any).query.toSql()
  }

  addConstraints (): void { }

  getRelationCountHash (incrementJoinCount: boolean = true): string {
    return (
      'arquebus_reserved_' +
      (incrementJoinCount
        ? (this.constructor as any).selfJoinCount++
        : (this.constructor as any).selfJoinCount)
    )
  }

  getRelationExistenceQuery (
    query: any,
    parentQuery: any,
    columns: string[] = ['*'],
  ): any {
    return query
      .select(columns)
      .whereColumn(
        this.getQualifiedParentKeyName(),
        '=',
        this.getExistenceCompareKey(),
      )
  }

  getRelationExistenceCountQuery (query: any, parentQuery: any): any {
    const db = this.related.getConnection()
    return this.getRelationExistenceQuery(
      query,
      parentQuery,
      db.raw('count(*)'),
    )
  }

  getQualifiedParentKeyName (): string {
    return this.parent.getQualifiedKeyName()
  }

  getExistenceCompareKey (this: any): string {
    return this.getQualifiedForeignKeyName?.() // BelongsToMany overrides this
  }
}

export default Relation

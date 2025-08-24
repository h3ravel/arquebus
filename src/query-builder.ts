import type { IPaginator, IPaginatorParams } from 'types/utils'
import type { IQueryBuilder, SchemaBuilder } from 'types/query-builder'

import type { Knex } from 'knex'
import type Model from 'src/model'
import Paginator from './paginator'
import type { TConfig } from 'types/container'
import type { TFunction } from 'types/generics'

const Inference = class { } as { new <M extends Model = Model, R = M[] | M>(): IQueryBuilder<M, R> }

export class QueryBuilder<M extends Model = Model, R = M[] | M> extends Inference<M, R> {
    model!: M
    schema!: SchemaBuilder
    private connector: IQueryBuilder<M, R> & Knex.QueryBuilder & { _statements: any[], _single: any }

    constructor(config: TConfig | null, connector: TFunction) {
        super()
        this.connector = connector(config)
        return this.asProxy()
    }

    asProxy () {
        const handler = {
            get: function (target: QueryBuilder<M, R>, prop: keyof QueryBuilder<M, R>) {
                if (typeof target[prop] !== 'undefined') {
                    return target[prop]
                }

                if (['destroy', 'schema'].includes(prop)) {
                    return target.connector.schema
                }

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
                ].includes(prop)) {
                    return (...args: any[]) => {
                        (target.connector as any)[prop](...args)
                        return target.asProxy()
                    }
                }
                return (target.connector as any)[prop]
            },
            set: function (target: QueryBuilder<M, R>, prop: keyof QueryBuilder<M, R>, value: string) {
                if (typeof target[prop] !== 'undefined') {
                    (target as any)[prop] = value
                    return target
                }

                (target.connector as any)[prop] = value
                return target as any
            }
        }

        return new Proxy(this, handler) as any
    }
    async beginTransaction () {
        return await this.connector.transaction()
    }
    override table<X extends M> (table: string): IQueryBuilder<X, R> {
        const c = this.connector.table(table)
        return new QueryBuilder(null, () => c) as any
    }
    transaction (callback?: TFunction): Promise<Knex.Transaction> | undefined {
        if (callback) {
            return this.connector.transaction((trx) => {
                return callback(new QueryBuilder(null, () => trx))
            })
        }
        return callback
    }
    async find (id: string | number, columns: string[] = ['*']) {
        return await this.connector.where('id', id).first(...columns)
    }
    async get (_columns: string[] = ['*']) {
        return await this.connector
    }
    async exists () {
        return await this.connector.first() !== null
    }
    skip (this: any, ...args: any[]) {
        return this.offset(...args)
    }
    take (this: any, ...args: any[]) {
        return this.limit(...args)
    }
    async chunk (count: number, callback: TFunction) {
        if (this.connector._statements.filter(item => item.grouping === 'order').length === 0) {
            throw new Error('You must specify an orderBy clause when using this function.')
        }
        let page = 1
        let countResults
        do {
            const builder = this.clone()
            const results = await builder.forPage(page, count).get()
            countResults = results.length
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
    async paginate<F extends IPaginatorParams> (this: any, page = 1, perPage = 15): Promise<IPaginator<M, F>> {
        const query = this.clone()
        const total = await query.clearOrder().count('*')
        let results
        if (total > 0) {
            const skip = (page - 1) * perPage
            this.take(perPage).skip(skip)
            results = await this.get()
        }
        else {
            results = []
        }
        return new Paginator(results, parseInt(total), perPage, page)
    }
    forPage (this: any, page = 1, perPage = 15) {
        return this.offset((page - 1) * perPage).limit(perPage)
    }
    toSQL (...args: Parameters<typeof this.connector.toSQL>) {
        return this.connector.toSQL(...args)
    }
    async count (column: string) {
        const [{ aggregate }] = await this.connector.count(column, { as: 'aggregate' })
        return Number(aggregate)
    }
    async min (column: string) {
        const [{ aggregate }] = await this.connector.min(column, { as: 'aggregate' })
        return Number(aggregate)
    }
    async max (column: string) {
        const [{ aggregate }] = await this.connector.max(column, { as: 'aggregate' })
        return Number(aggregate)
    }
    async sum (column: string) {
        const [{ aggregate }] = await this.connector.sum(column, { as: 'aggregate' })
        return Number(aggregate)
    }
    async avg (column: string) {
        const [{ aggregate }] = await this.connector.avg(column, { as: 'aggregate' })
        return Number(aggregate)
    }
    clone () {
        const c = this.connector.clone()
        return new QueryBuilder(null, () => c) as unknown as IQueryBuilder<M, R>
    }
    async delete () {
        return await this.connector.delete()
    }
    async insert (...args: Parameters<typeof this.connector.insert>) {
        return await this.connector.insert(...args)
    }
    async update (...args: Parameters<typeof this.connector.update>) {
        return await this.connector.update(...args)
    }
    destroy (...args: Parameters<typeof this.connector.destroy>) {
        return this.connector.destroy(...args)
    }
    get _statements () {
        return this.connector._statements
    }
    get _single () {
        return this.connector._single
    }
    get from () {
        return this.connector.from
    }
}

export default QueryBuilder

import { AnyQueryBuilder, GroupByMethod, JoinMethod, JoinRawMethod, OrderByMethod, OrderByRawMethod, Raw, RawInterface, SelectMethod, SetOperationsMethod, UnionMethod, WhereBetweenMethod, WhereColumnMethod, WhereExistsMethod, WhereFieldExpressionMethod, WhereInMethod, WhereJsonExpressionMethod, WhereMethod, WhereNullMethod, WhereRawMethod, WhereWrappedMethod } from './query-methods'

import type { Knex } from 'knex'
import type { Paginator } from './utils'

export type SchemaBuilder = Knex.SchemaBuilder;

type Trx = AnyQueryBuilder & {
    commit (): Promise<void>;
    rollback (): Promise<void>;
};

interface AsMethod<QB extends AnyQueryBuilder> {
    (alias: string): QB;
}

export type IConnector = Knex & Knex.QueryBuilder

export interface IQueryBuilder<M, R = M[] | M> {
    connector: IConnector
    schema: SchemaBuilder
    table (name: string): this;
    select: SelectMethod<this>
    columns: SelectMethod<this>
    column: SelectMethod<this>
    distinct: SelectMethod<this>
    distinctOn: SelectMethod<this>
    as: AsMethod<this>

    where: WhereMethod<this>
    andWhere: WhereMethod<this>
    orWhere: WhereMethod<this>
    whereNot: WhereMethod<this>
    andWhereNot: WhereMethod<this>
    orWhereNot: WhereMethod<this>

    whereRaw: WhereRawMethod<this>
    orWhereRaw: WhereRawMethod<this>
    andWhereRaw: WhereRawMethod<this>

    whereWrapped: WhereWrappedMethod<this>
    havingWrapped: WhereWrappedMethod<this>

    whereExists: WhereExistsMethod<this>
    orWhereExists: WhereExistsMethod<this>
    whereNotExists: WhereExistsMethod<this>
    orWhereNotExists: WhereExistsMethod<this>

    whereIn: WhereInMethod<this>
    orWhereIn: WhereInMethod<this>
    whereNotIn: WhereInMethod<this>
    orWhereNotIn: WhereInMethod<this>

    whereBetween: WhereBetweenMethod<this>
    orWhereBetween: WhereBetweenMethod<this>
    andWhereBetween: WhereBetweenMethod<this>
    whereNotBetween: WhereBetweenMethod<this>
    orWhereNotBetween: WhereBetweenMethod<this>
    andWhereNotBetween: WhereBetweenMethod<this>

    whereNull: WhereNullMethod<this>
    orWhereNull: WhereNullMethod<this>
    whereNotNull: WhereNullMethod<this>
    orWhereNotNull: WhereNullMethod<this>

    whereColumn: WhereColumnMethod<this>
    orWhereColumn: WhereColumnMethod<this>
    andWhereColumn: WhereColumnMethod<this>
    whereNotColumn: WhereColumnMethod<this>
    orWhereNotColumn: WhereColumnMethod<this>
    andWhereNotColumn: WhereColumnMethod<this>

    whereJsonIsArray: WhereFieldExpressionMethod<this>
    orWhereJsonIsArray: WhereFieldExpressionMethod<this>
    whereJsonNotArray: WhereFieldExpressionMethod<this>
    orWhereJsonNotArray: WhereFieldExpressionMethod<this>
    whereJsonIsObject: WhereFieldExpressionMethod<this>
    orWhereJsonIsObject: WhereFieldExpressionMethod<this>
    whereJsonNotObject: WhereFieldExpressionMethod<this>
    orWhereJsonNotObject: WhereFieldExpressionMethod<this>
    whereJsonHasAny: WhereJsonExpressionMethod<this>
    orWhereJsonHasAny: WhereJsonExpressionMethod<this>
    whereJsonHasAll: WhereJsonExpressionMethod<this>
    orWhereJsonHasAll: WhereJsonExpressionMethod<this>

    having: WhereMethod<this>
    andHaving: WhereMethod<this>
    orHaving: WhereMethod<this>

    havingRaw: WhereRawMethod<this>
    orHavingRaw: WhereRawMethod<this>

    havingIn: WhereInMethod<this>
    orHavingIn: WhereInMethod<this>
    havingNotIn: WhereInMethod<this>
    orHavingNotIn: WhereInMethod<this>

    havingNull: WhereNullMethod<this>
    orHavingNull: WhereNullMethod<this>
    havingNotNull: WhereNullMethod<this>
    orHavingNotNull: WhereNullMethod<this>

    havingExists: WhereExistsMethod<this>
    orHavingExists: WhereExistsMethod<this>
    havingNotExists: WhereExistsMethod<this>
    orHavingNotExists: WhereExistsMethod<this>

    havingBetween: WhereBetweenMethod<this>
    orHavingBetween: WhereBetweenMethod<this>
    havingNotBetween: WhereBetweenMethod<this>
    orHavingNotBetween: WhereBetweenMethod<this>

    union: UnionMethod<this>
    unionAll: UnionMethod<this>
    intersect: SetOperationsMethod<this>

    join: JoinMethod<this>
    joinRaw: JoinRawMethod<this>
    innerJoin: JoinMethod<this>
    leftJoin: JoinMethod<this>
    leftOuterJoin: JoinMethod<this>
    rightJoin: JoinMethod<this>
    rightOuterJoin: JoinMethod<this>
    outerJoin: JoinMethod<this>
    fullOuterJoin: JoinMethod<this>
    crossJoin: JoinMethod<this>

    orderBy: OrderByMethod<this>
    orderByRaw: OrderByRawMethod<this>

    groupBy: GroupByMethod<this>
    groupByRaw: RawInterface<this>

    beginTransaction (): Promise<Trx>;
    transaction (callback: (trx: Trx) => Promise<any>): Promise<any>;
    destroy (): void;
    clone (): IQueryBuilder<M, R>;
    raw (sql: string, bindings?: any[]): Raw;
    get<T = M> (columns?: string[]): Promise<T[]>;
    first<T = M> (columns?: string[]): Promise<T | null | undefined>;
    find<T = M> (key: string | number, columns?: string[]): Promise<T>;
    insert (attributes: any): Promise<unknown>;
    update (attributes: any): Promise<unknown>;
    delete (): Promise<number>;
    exists (): Promise<boolean>;
    count (column?: string): Promise<number>;
    min (column: string): Promise<number>;
    max (column: string): Promise<number>;
    sum (column: string): Promise<number>;
    avg (column: string): Promise<number>;
    skip (count: number): this;
    take (count: number): this;
    limit (count: number): this;
    offset (count: number): this;
    chunk (count: number, callback: (rows: M[]) => any): Promise<boolean>;
    forPage (page: number, perPage?: number): this;
    paginate<F = { current_page: number, data: M[], per_page: number, total: number, last_page: number, count: number, }> (page: number, perPage?: number): Promise<Paginator<M, F>>;
}

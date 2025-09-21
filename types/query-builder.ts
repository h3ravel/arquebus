import type { AnyQueryBuilder, GroupByMethod, JoinMethod, JoinRawMethod, OrderByMethod, OrderByRawMethod, RawInterface, SelectMethod, SetOperationsMethod, UnionMethod, WhereBetweenMethod, WhereColumnMethod, WhereExistsMethod, WhereFieldExpressionMethod, WhereInMethod, WhereJsonExpressionMethod, WhereMethod, WhereNullMethod, WhereRawMethod, WhereWrappedMethod } from './query-methods'
import type { ICollection, IPaginator, IPaginatorParams } from './utils'
import type { TFunction, TGeneric } from './generics'

import type BModel from 'src/browser/model'
import type { Knex } from 'knex'
import type Model from 'src/model'

export interface SchemaBuilder extends Knex.SchemaBuilder {
    [k: string]: any
};

interface AsMethod<QB extends AnyQueryBuilder> {
    (alias: string): QB;
}

export interface IStatement {
    grouping: string
    direction: string
    type: string
    value: () => any,
    not: boolean
    nulls: boolean
    bool: 'and' | 'or' | 'not'
}

export type IConnector<M extends TGeneric = any, R = any> = Knex & Knex.QueryBuilder<M, R>

export interface IQueryBuilder<M extends Model | BModel = Model, R = M[] | M> {
    // connector: IQueryBuilder<M, R>
    schema: SchemaBuilder
    _statements: IStatement[],
    table (name: string): IQueryBuilder<M, R>
    select: SelectMethod<this>
    columns: SelectMethod<this>
    column: SelectMethod<this>
    distinct: SelectMethod<this>
    distinctOn: SelectMethod<this>
    as: AsMethod<this>
    asProxy (): IQueryBuilder<M, R>
    where: WhereMethod<this>
    andWhere: WhereMethod<this>
    // orWhere: WhereMethod<this>
    orWhere (...args: any[]): this
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
    transaction (callback?: TFunction): Promise<Knex.Transaction> | undefined;
    destroy (callback: TFunction): Promise<number>;
    destroy (): Promise<number>;
    clone (): IQueryBuilder<M, R>;
    raw: Knex.RawQueryBuilder<TGeneric, M>;
    get (columns?: string[]): Promise<any>;
    first (columns?: string[]): Promise<M | null | undefined>;
    find (key: string | number, columns?: string[]): Promise<M | null | undefined>;
    insert (attributes: any): Promise<unknown>;
    update (...attributes: any[]): Promise<number>;
    delete (): Promise<boolean | number>;
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
    pluck<X extends Model = any> (column: string): Promise<Array<X>>;
    chunk (count: number, callback: (rows: M[]) => any): Promise<boolean>;
    forPage (page: number, perPage?: number): this;
    paginate<F extends IPaginatorParams> (page?: number, perPage?: number): Promise<IPaginator<M, F>>;
}

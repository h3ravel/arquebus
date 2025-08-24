import type { AnyQueryBuilder, WithRelationType } from './query-methods'
import type { ICollection, IPaginator, IPaginatorParams } from './utils'

import type BModel from 'src/browser/model'
import type Builder from 'src/builder'
import type { IModel } from './modeling'
import type { IQueryBuilder } from './query-builder'
import type Model from 'src/model'

// type BaseBuilder<M extends Model, R> = Omit<
//     IQueryBuilder<M, R>,
//     'destroy' | 'clone' | 'get' | 'skip' | 'limit' | 'take' | 'offset' | 'chunk' | 'forPage'
// >

export interface IScope {
    apply (builder: Builder<any>, model: Model): void;
}


export interface IBuilder<M extends Model | BModel, R = ICollection<M> | IModel> extends IQueryBuilder<M, R> {
    asProxy (): IQueryBuilder<M, R>;
    // chunk (count: number, callback: (rows: ICollection<M>) => any): Promise<boolean>;
    enforceOrderBy (): void;
    // clone (): IBuilder<M, R>;
    // forPage (page: number, perPage?: number): this;
    insert (attributes: any): Promise<any>;
    update (attributes: any): Promise<any>;
    increment (column: string, amount?: number, extra?: any): Promise<any>;
    decrement (column: string, amount?: number, extra?: any): Promise<any>;
    addUpdatedAtColumn (values: any): any;
    delete (): Promise<boolean | number>;
    softDelete (): boolean | Promise<any>;
    forceDelete (): boolean | Promise<any>;
    restore (): boolean | Promise<any>;
    withTrashed (): this;
    withoutTrashed (): this;
    onlyTrashed (): this;
    getDeletedAtColumn (): string;
    create (attributes?: any): Promise<M>;
    newModelInstance (attributes?: any): M;
    count (columns?: string): Promise<number>;
    getQuery (): AnyQueryBuilder;
    getModel (): M;
    setModel (model: M): this;
    setTable (table: string): this;
    applyScopes (): this;
    scopes (scopes: string[]): this;
    withGlobalScope (identifier: string | number, scope: string | (() => void)): this;
    withoutGlobalScope (scope: IScope | string): this;
    with (relation: WithRelationType): this;
    with (...relations: WithRelationType[]): this;
    has (relation: string, operator?: any, count?: number, boolean?: any, callback?: (builder: IBuilder<any>) => void | null): this;
    orHas (relation: string, operator?: any, count?: number): this;
    doesntHave (relation: string, boolean?: any, callback?: (builder: IBuilder<any>) => void | null): this;
    orDoesntHave (relation: string): this;
    whereHas (relation: string, callback?: (builder: IBuilder<any>) => void | IBuilder<any> | null, operator?: any, count?: number): this;
    orWhereHas (relation: string, callback?: (builder: IBuilder<any>) => void | IBuilder<any> | null, operator?: any, count?: number): this;
    whereRelation (relation: string, column: string, operator?: any, value?: any): this;
    hasNested (relation: string, operator?: any, count?: number, boolean?: any, callback?: (builder: IBuilder<any>) => void | null): this;
    canUseExistsForExistenceCheck (operator: string, count: number): boolean;
    addHasWhere (hasQuery: IBuilder<any>, relation: string, operator?: string, count?: number, boolean?: string): this;
    withAggregate (relations: string | string[] | object, column: string, action?: string | null): this;
    toSql (): object;
    withCount (...relations: WithRelationType[]): this;
    withMax (relation: WithRelationType, column: string): this;
    withMin (relation: WithRelationType, column: string): this;
    withAvg (relation: WithRelationType, column: string): this;
    withSum (relation: WithRelationType, column: string): this;
    withExists (relation: WithRelationType): this;
    related (relation: string): this;
    // take (count: number): this;
    // skip (count: number): this;
    // limit (count: number): this;
    // offset (count: number): this;
    first (column?: string | string[]): Promise<M | null | undefined>;
    firstOrFail (column?: string | string[]): Promise<M>;
    findOrFail (key: string | number, columns?: string[]): Promise<M>;
    findOrFail (key: string[] | number[] | ICollection<any>, columns?: string[]): Promise<M>;
    findOrFail (key: string | number | string[] | number[] | ICollection<any>, columns?: string[]): Promise<M>;
    findOrNew (id: string | number, columns?: string[]): Promise<M>;
    firstOrNew (attributes?: object, values?: object): Promise<M>;
    firstOrCreate (attributes?: object, values?: object): Promise<M>;
    updateOrCreate (attributes: object, values?: object): Promise<M>;
    latest (column?: string): this;
    oldest (column?: string): this;
    find (key: string | number, columns?: string[]): Promise<M | null | undefined>;
    findMany (keys: string[] | number[] | ICollection<any>, columns?: string[]): Promise<ICollection<M>>;
    pluck<X extends Model = any | M> (column: string): Promise<ICollection<X>>;
    // destroy (ids: string | number | string[] | number[] | ICollection<any>): Promise<number>;
    // get (columns?: string[]): Promise<ICollection<M>>;
    all (columns?: string[]): Promise<ICollection<M>>;
    paginate<F extends IPaginatorParams> (page?: number, perPage?: number): Promise<IPaginator<M, F>>;
    [value: string]: any;
}

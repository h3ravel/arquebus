import type { AnyQueryBuilder, WithRelationType } from './query-methods'
import type { ICollection, Paginator } from './utils'

import { IModel } from './modeling'
import type { IQueryBuilder } from './query-builder'

type BaseBuilder<M, R> = Omit<
    IQueryBuilder<M, R>,
    'destroy' | 'clone' | 'get' | 'skip' | 'limit' | 'take' | 'offset' | 'chunk' | 'forPage'
>

export interface IBuilder<M, R = ICollection<M> | IModel> extends BaseBuilder<M, R> {
    asProxy (): ProxyConstructor;
    chunk (count: number, callback: (rows: ICollection<M>) => any): Promise<boolean>;
    enforceOrderBy (): void;
    clone (): IBuilder<M, R>;
    forPage (page: number, perPage?: number): this;
    insert (attributes: any): Promise<any>;
    update (attributes: any): Promise<any>;
    increment (column: string, amount?: number, extra?: any): Promise<any>;
    decrement (column: string, amount?: number, extra?: any): Promise<any>;
    addUpdatedAtColumn (values: any): any;
    delete (): Promise<any>;
    softDelete (): Promise<any>;
    forceDelete (): Promise<any>;
    restore (): Promise<any>;
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
    withoutGlobalScope (identifier: string | number): this;
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
    take (count: number): this;
    skip (count: number): this;
    limit (count: number): this;
    offset (count: number): this;
    first<T = M> (column?: string | string[]): Promise<T | null>;
    firstOrFail<T = M> (column?: string | string[]): Promise<T>;
    findOrFail<T = M> (key: string | number, columns?: string[]): Promise<T>;
    findOrFail<T = M> (key: string[] | number[] | ICollection<any>, columns?: string[]): Promise<ICollection<T>>;
    findOrFail<T = M> (key: string | number | string[] | number[] | ICollection<any>, columns?: string[]): Promise<T | ICollection<T>>;
    findOrNew<T = M> (id: string | number, columns?: string[]): Promise<T>;
    firstOrNew<T = M> (attributes?: object, values?: object): Promise<T>;
    firstOrCreate<T = M> (attributes?: object, values?: object): Promise<T>;
    updateOrCreate (attributes: object, values?: object): Promise<M>;
    latest (column?: string): this;
    oldest (column?: string): this;
    find<T = M> (key: string | number, columns?: string[]): Promise<T | null>;
    find<T = M> (key: string[] | number[] | ICollection<any>, columns?: string[]): Promise<ICollection<T>>;
    find<T = M> (key: string | number | string[] | number[] | ICollection<any>, columns?: string[]): Promise<T | ICollection<T> | null>;
    findMany<T = M> (keys: string[] | number[] | ICollection<any>, columns?: string[]): Promise<ICollection<T>>;
    pluck (column: string): Promise<ICollection<any>>;
    destroy (ids: string | number | string[] | number[] | ICollection<any>): Promise<number>;
    get<T = M> (columns?: string[]): Promise<ICollection<T>>;
    all<T = M> (columns?: string[]): Promise<ICollection<T>>;
    paginate<F = { current_page: number, data: any[], per_page: number, total: number, last_page: number, count: number, }> (page?: number, perPage?: number): Promise<Paginator<M, F>>;
    [value: string]: any;
}

export interface Scope {
    apply (builder: IBuilder<any>, model: IModel): void;
}

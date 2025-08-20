import type { Collection as BaseCollection } from 'collect.js'
import { IBuilder } from './builder'
import { IModel } from './modeling'
import { WithRelationType } from './query-methods'

export interface ICollection<T> extends BaseCollection<T> {
    load (...relations: WithRelationType[]): Promise<this>;
    loadAggregate (relations: string | string[], column: string, action?: string | null): Promise<this>;
    loadCount (relation: string, column: string): Promise<this>;
    loadMax (relation: string, column: string): Promise<this>;
    loadMin (relation: string, column: string): Promise<this>;
    loadSum (relation: string, column: string): Promise<this>;
    loadAvg (relation: string, column: string): Promise<this>;
    mapThen (callback: () => void): Promise<any>;
    modelKeys (): string[] | number[];
    contains (key: IModel | any, operator?: any, value?: any): boolean;
    diff (items: ICollection<T> | any[]): ICollection<T>;
    except (keys: any[]): ICollection<T>;
    intersect (items: any[]): ICollection<T>;
    unique (key?: any, strict?: boolean): ICollection<T>;
    find (key: any, defaultValue?: any): any;
    fresh (withs?: any[]): Promise<ICollection<T>>;
    makeVisible (attributes: string | string[]): this;
    makeHidden (attributes: string | string[]): this;
    append (attributes: string[]): this;
    only (keys: null | any[]): this;
    getDictionary (items?: any): any;
    toQuery (): IBuilder<T, any>;
    toData (): any;
    toJSON (): any;
    toJson (): string;
    toString (): string;
    [Symbol.iterator] (): Iterator<T>;
}

export interface Paginator<T, K = {
    current_page: number,
    data: any[],
    per_page: number,
    total: number,
    last_page: number,
    count: number,
}> {
    formatter: (paginator: Paginator<any>) => any | null
    setFormatter (formatter: (paginator: Paginator<any>) => any | null): void;
    setItems (items: T[] | ICollection<T>): void;
    hasMorePages (): boolean;
    get (index: number): T;
    count (): number;
    items (): ICollection<T>;
    map<U> (callback: (value: T, index: number, array: T[]) => U): ICollection<U>;
    currentPage (): number;
    perPage (): number;
    lastPage (): number;
    firstItem (): number | null;
    lastItem (): number | null;
    total (): number;
    toData<U = K> (): U;
    toJSON<U = K> (): U;
    toJson (): string;
    [Symbol.iterator] (): { next: () => { value: T; done: boolean } };
}

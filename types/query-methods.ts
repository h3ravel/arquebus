import type { IBuilder } from './builder'
import type { IQueryBuilder } from './query-builder'
import type { Knex } from 'knex'
import type { Model } from 'src/model'
import type { PrimitiveValue } from './generics'

type Operator = string;
type ColumnRef = string | Raw;
type FieldExpression = string;
type JsonObjectOrFieldExpression = object | object[] | FieldExpression;

type TableRef<QB extends AnyQueryBuilder> = ColumnRef | AnyQueryBuilder | CallbackVoid<QB>;
type Selection<QB extends AnyQueryBuilder> = ColumnRef | AnyQueryBuilder | CallbackVoid<QB>;
type QBOrCallback<QB extends AnyQueryBuilder> = AnyQueryBuilder | CallbackVoid<QB>;

interface CallbackVoid<T> {
    (this: T, arg: T): void;
}

export type Raw = Knex.Raw;

export type OrderByDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

export interface OrderByDescriptor {
    column: ColumnRef;
    order?: OrderByDirection;
}

export type AnyQueryBuilder<M extends Model = any, R = any> = IQueryBuilder<M, R> | IBuilder<M, R>;

export type Expression<T> = T | Raw | AnyQueryBuilder;

export type ColumnRefOrOrderByDescriptor = ColumnRef | OrderByDescriptor;

export interface RawInterface<R> {
    (sql: string, ...bindings: any[]): R;
}

export interface BaseSetOperations<QB extends AnyQueryBuilder> {
    (callbackOrBuilder: QBOrCallback<QB>, wrap?: boolean): QB;
    (callbacksOrBuilders: QBOrCallback<QB>[], wrap?: boolean): QB;
}

export type JoinRawMethod<QB extends AnyQueryBuilder> = RawInterface<QB> & {}

export type OrderByRawMethod<QB extends AnyQueryBuilder> = RawInterface<QB> & {}

export type WhereRawMethod<QB extends AnyQueryBuilder> = RawInterface<QB> & {}

export interface GroupByMethod<QB extends AnyQueryBuilder> {
    (...columns: ColumnRef[]): QB;
    (columns: ColumnRef[]): QB;
}

export type WithRelationType = {
    [key: string]: <T extends IBuilder<any>>(builder: T) => T | void;
} | string | string[];

export interface SetOperationsMethod<QB extends AnyQueryBuilder> extends BaseSetOperations<QB> {
    (...callbacksOrBuilders: QBOrCallback<QB>[]): QB;
}

export interface SelectMethod<QB extends AnyQueryBuilder> {
    <QBP extends QB> (...columns: Selection<QBP>[]): QB;
    <QBP extends QB> (columns: Selection<QBP>[]): QB;
}

export interface WhereMethod<QB extends AnyQueryBuilder> {
    (col: ColumnRef, op: Operator, expr: Expression<PrimitiveValue>): QB;
    (col: ColumnRef, expr: Expression<PrimitiveValue>): QB;

    (condition: boolean): QB;
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBA extends AnyQueryBuilder> (qb: QBA): QB;

    (obj: object): QB;
}

export interface WhereWrappedMethod<QB extends AnyQueryBuilder> {
    (cb: CallbackVoid<QB>): QB;
}

export interface WhereFieldExpressionMethod<QB extends AnyQueryBuilder> {
    (fieldExpression: FieldExpression): QB;
}

export interface WhereExistsMethod<QB extends AnyQueryBuilder> {
    (cb: CallbackVoid<QB>): QB;
    (raw: Raw): QB;
    <QBA extends AnyQueryBuilder> (qb: QBA): QB;
}

export interface WhereInMethod<QB extends AnyQueryBuilder> {
    (col: ColumnRef | ColumnRef[], expr: Expression<PrimitiveValue>[]): QB;
    (col: ColumnRef | ColumnRef[], cb: CallbackVoid<QB>): QB;
    (col: ColumnRef | ColumnRef[], qb: AnyQueryBuilder): QB;
}

export interface WhereBetweenMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, range: [Expression<PrimitiveValue>, Expression<PrimitiveValue>]): QB;
}

export interface WhereNullMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef): QB;
}

export interface OrderByMethod<QB extends AnyQueryBuilder> {
    (column: ColumnRef, order?: OrderByDirection): QB;
    (columns: ColumnRefOrOrderByDescriptor[]): QB;
}

export interface WhereJsonExpressionMethod<QB extends AnyQueryBuilder> {
    (fieldExpression: FieldExpression, keys: string | string[]): QB;
}

export interface WhereColumnMethod<QB extends AnyQueryBuilder> {
    (col1: ColumnRef, op: Operator, col2: ColumnRef): QB;
    (col1: ColumnRef, col2: ColumnRef): QB;
}

export interface JoinMethod<QB extends AnyQueryBuilder> {
    (table: TableRef<QB>, leftCol: ColumnRef, op: Operator, rightCol: ColumnRef): QB;
    (table: TableRef<QB>, leftCol: ColumnRef, rightCol: ColumnRef): QB;
    (table: TableRef<QB>, cb: CallbackVoid<Knex.JoinClause>): QB;
    (table: TableRef<QB>, raw: Raw): QB;
    (raw: Raw): QB;
}

export interface WhereJsonMethod<QB extends AnyQueryBuilder> {
    (
        fieldExpression: FieldExpression,
        jsonObjectOrFieldExpression: JsonObjectOrFieldExpression
    ): QB;
}

export interface UnionMethod<QB extends AnyQueryBuilder> extends BaseSetOperations<QB> {
    (arg1: QBOrCallback<QB>, wrap?: boolean): QB;
    (arg1: QBOrCallback<QB>, arg2: QBOrCallback<QB>, wrap?: boolean): QB;
    (arg1: QBOrCallback<QB>, arg2: QBOrCallback<QB>, arg3: QBOrCallback<QB>, wrap?: boolean): QB;
    (
        arg1: QBOrCallback<QB>,
        arg2: QBOrCallback<QB>,
        arg3: QBOrCallback<QB>,
        arg4: QBOrCallback<QB>,
        wrap?: boolean
    ): QB;
    (
        arg1: QBOrCallback<QB>,
        arg2: QBOrCallback<QB>,
        arg3: QBOrCallback<QB>,
        arg4: QBOrCallback<QB>,
        arg5: QBOrCallback<QB>,
        wrap?: boolean
    ): QB;
    (
        arg1: QBOrCallback<QB>,
        arg2: QBOrCallback<QB>,
        arg3: QBOrCallback<QB>,
        arg4: QBOrCallback<QB>,
        arg5: QBOrCallback<QB>,
        arg6: QBOrCallback<QB>,
        wrap?: boolean
    ): QB;
    (
        arg1: QBOrCallback<QB>,
        arg2: QBOrCallback<QB>,
        arg3: QBOrCallback<QB>,
        arg4: QBOrCallback<QB>,
        arg5: QBOrCallback<QB>,
        arg6: QBOrCallback<QB>,
        arg7: QBOrCallback<QB>,
        wrap?: boolean
    ): QB;
}

export interface JoinMethod<QB extends AnyQueryBuilder> {
    (table: TableRef<QB>, leftCol: ColumnRef, op: Operator, rightCol: ColumnRef): QB;
    (table: TableRef<QB>, leftCol: ColumnRef, rightCol: ColumnRef): QB;
    (table: TableRef<QB>, cb: CallbackVoid<Knex.JoinClause>): QB;
    (table: TableRef<QB>, raw: Raw): QB;
    (raw: Raw): QB;
}

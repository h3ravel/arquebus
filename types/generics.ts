import Model from 'src/model'

export type TGeneric = Record<string, any>

export interface Plugin {
    (model: Model, config: TGeneric): void
}

export type Hook =
    | 'creating' | 'created' | 'updating' | 'updated' | 'saving' | 'saved' | 'deleting' | 'deleted'
    | 'restoring' | 'restored' | 'trashed' | 'forceDeleted';

export type TFunction<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => TReturn;

export type PrimitiveValue =
    | string
    | number
    | boolean
    | Date
    | string[]
    | number[]
    | boolean[]
    | Date[]
    | null
    | Buffer;

export type ReturnTypeOfMethod<T, K extends keyof T> = T[K] extends (...args: any[]) => infer R ? R : never;

export type SnakeToCamelCase<S extends string> =
    S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelCase<U>>}` : S;

// declare const model: ModelDecorator;
export type CamelToSnakeCase<S extends string> =
    S extends `${infer T}${infer U}` ?
    U extends Uncapitalize<U> ? `${Uncapitalize<T>}${CamelToSnakeCase<U>}` : `${Uncapitalize<T>}_${CamelToSnakeCase<U>}` :
    S;

export type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type RelationNames<T> = FunctionPropertyNames<T> extends infer R
    ? R extends `relation${infer P}` ? P extends ('sToData' | 'loaded') ? never : CamelToSnakeCase<P> : never
    : never;

export type MixinConstructor<T = any> = new (...args: T[]) => T

// Helper type: combine all mixin instance types into a single intersection
export type MixinReturn<Base extends MixinConstructor, Mixins extends ((base: any) => any)[]> =
    Base extends MixinConstructor<infer B>
    ? IntersectionOfInstances<InstanceTypeOfMixins<Mixins>> & B
    : never

export type InstanceTypeOfMixins<T extends ((base: any) => any)[]> =
    T extends [infer Head, ...infer Tail]
    ? Head extends (base: any) => infer R
    ? Tail extends ((base: any) => any)[]
    ? R | InstanceTypeOfMixins<Tail>
    : R
    : never
    : never

export type IntersectionOfInstances<U> =
    (U extends any ? (x: U) => any : never) extends (x: infer I) => any ? I : never

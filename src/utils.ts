import type { MixinConstructor, XGeneric } from 'types/generics'
import { camel, dash, snake, trim } from 'radashi'

import type { TConfig } from 'types/container'
import advancedFormat from 'dayjs/plugin/advancedFormat.js'
import dayjs from 'dayjs'

dayjs.extend(advancedFormat)

export const now = (format = 'YYYY-MM-DD HH:mm:ss') => dayjs().format(format)

export const getRelationName = (relationMethod: string) => {
  // 'relation' length 8
  return snake(relationMethod.substring(8))
}

export const getScopeName = (scopeMethod: string) => {
  // 'scope' length 5
  return snake(scopeMethod.substring(5))
}

export const getRelationMethod = (relation: string) => {
  return camel(`relation_${relation}`)
}

export const getScopeMethod = (scope: string) => {
  return camel(`scope_${scope}`)
}

export const getAttrMethod = (attr: string) => {
  return camel(`attribute_${attr}`)
}

export const getGetterMethod = (attr: string) => {
  return camel(`get_${attr}_attribute`)
}

export const getSetterMethod = (attr: string) => {
  return camel(`set_${attr}_attribute`)
}

export const getAttrName = (attrMethod: string) => {
  return attrMethod.substring(3, attrMethod.length - 9).toLowerCase()
}

/**
 * Tap into a model a collection instance
 * 
 * @param instance 
 * @param callback 
 * @returns 
 */
export const tap = <I> (instance: I, callback: (ins: I) => Promise<I> | I): Promise<I> | I => {
  const result = callback(instance)
  return result instanceof Promise ? result.then(() => instance) : instance
}

/* Utility: turns union into intersection */
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never

type Mixin<TBase extends MixinConstructor, TReturn extends MixinConstructor> =
  (base: TBase) => TReturn

/**
 * Compose functional mixins
 * 
 * @param Base 
 * @param mixins 
 * @returns 
 */
export function compose<
  MC extends MixinConstructor,
  P extends Mixin<MC, MixinConstructor>[]
> (
  Base: MC,
  ...mixins: P
): new (...args: any[]) =>
    InstanceType<MC> &
    UnionToIntersection<InstanceType<ReturnType<P[number]>>> {

  return mixins.reduce((acc, mixin) => mixin(acc) as any, Base) as any
}

export const flattenDeep = (arr: any) => Array.isArray(arr)
  ? arr.reduce((a, b) => a.concat(flattenDeep(b)), [])
  : [arr]

export const kebabCase = (str: string) => trim(dash(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-')
export const snakeCase = (str: string) => trim(snake(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-')

export const defineConfig = (config: TConfig): XGeneric<TConfig> => {
  return config
}

export default {
  now,
  getRelationName,
  getScopeName,
  getRelationMethod,
  getScopeMethod,
  getAttrMethod,
  getGetterMethod,
  getSetterMethod,
  defineConfig,
  getAttrName,
  compose,
  tap
}

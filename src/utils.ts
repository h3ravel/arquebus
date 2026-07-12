import * as comp from 'src/mixin'

import { Str } from '@h3ravel/support'

import type { TConfig } from 'types/container'
import type { XGeneric } from 'types/generics'
import dayjs from './dayjs'

export const now = (format = 'YYYY-MM-DD HH:mm:ss') => dayjs().format(format)

export const getRelationName = (relationMethod: string) => {
  // 'relation' length 8
  return Str.snake(relationMethod.substring(8))
}

export const getScopeName = (scopeMethod: string) => {
  // 'scope' length 5
  return Str.snake(scopeMethod.substring(5))
}

export const getRelationMethod = (relation: string) => {
  return Str.camel(`relation_${relation}`)
}

export const getScopeMethod = (scope: string) => {
  return Str.camel(`scope_${scope}`)
}

export const getAttrMethod = (attr: string) => {
  return Str.camel(`attribute_${attr}`)
}

export const getGetterMethod = (attr: string) => {
  return Str.camel(`get_${attr}_attribute`)
}

export const getSetterMethod = (attr: string) => {
  return Str.camel(`set_${attr}_attribute`)
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
export const tap = <I>(
  instance: I,
  callback: (ins: I) => Promise<I> | I,
): Promise<I> | I => {
  const result = callback(instance)
  return result instanceof Promise ? result.then(() => instance) : instance
}

export const { compose } = comp

export const flatten = <A = any>(arr: A[]) => arr.flat()

export const flattenDeep = (arr: any) =>
  Array.isArray(arr)
    ? arr.reduce((a, b) => a.concat(flattenDeep(b)), [])
    : [arr]

export const kebabCase = (str: string) =>
  Str.trim(Str.kebab(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-').replace(/-+/g, '-')
export const snakeCase = (str: string) =>
  Str.trim(Str.snake(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-').replace(/_+/g, '_')

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
  tap,
}

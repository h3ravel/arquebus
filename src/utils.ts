import { MixinConstructor, MixinReturn } from 'types/generics'
import { camel, dash, snake, trim } from 'radashi'

import advancedFormat from 'dayjs/plugin/advancedFormat'
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
export const tap = <I> (instance: I, callback: (ins: I) => Promise<I> | I) => {
  const result = callback(instance)
  return result instanceof Promise ? result.then(() => instance) : instance
}

/**
 * Compose functional mixins
 * 
 * @param Base 
 * @param mixins 
 * @returns 
 */
export function compose<Base extends MixinConstructor, Mixins extends ((base: any) => any)[]> (
  Base: Base,
  ...mixins: Mixins
) {
  /**
   * Apply each mixin in sequence
   */
  return mixins.reduce(
    (cls, mixin) => mixin(cls),
    Base) as unknown as MixinReturn<Base, Mixins>
}

export const flattenDeep = (arr: any) => Array.isArray(arr)
  ? arr.reduce((a, b) => a.concat(flattenDeep(b)), [])
  : [arr]

export const kebabCase = (str: string) => trim(dash(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-')
export const snakeCase = (str: string) => trim(snake(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-')

export default {
  now,
  getRelationName,
  getScopeName,
  getRelationMethod,
  getScopeMethod,
  getAttrMethod,
  getGetterMethod,
  getSetterMethod,
  getAttrName,
  compose,
  tap
}

import { camel, dash, snake, trim } from 'radashi'

import advancedFormat from 'dayjs/plugin/advancedFormat.js'
import dayjs from 'dayjs'

dayjs.extend(advancedFormat)

export const now = (format = 'YYYY-MM-DD HH:mm:ss') => dayjs().format(format)

export const getRelationName = (relationMethod) => {
  // 'relation' length 8
  return snake(relationMethod.substring(8))
}

export const getScopeName = (scopeMethod) => {
  // 'scope' length 5
  return snake(scopeMethod.substring(5))
}

export const getRelationMethod = (relation) => {
  return camel(`relation_${relation}`)
}

export const getScopeMethod = (scope) => {
  return camel(`scope_${scope}`)
}

export const getAttrMethod = (attr) => {
  return camel(`attribute_${attr}`)
}

export const getGetterMethod = (attr) => {
  return camel(`get_${attr}_attribute`)
}

export const getSetterMethod = (attr) => {
  return camel(`set_${attr}_attribute`)
}

export const getAttrName = (attrMethod) => {
  return attrMethod.substring(3, attrMethod.length - 9).toLowerCase()
}

/**
 * Tap into a model a collection instance
 * 
 * @param instance 
 * @param callback 
 * @returns 
 */
export const tap = (instance, callback) => {
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
export function compose (
  Base,
  ...mixins
) {
  /**
   * Apply each mixin in sequence
   */
  return mixins.reduce(
    (cls, mixin) => mixin(cls),
    Base)
}

export const flattenDeep = (arr) => Array.isArray(arr)
  ? arr.reduce((a, b) => a.concat(flattenDeep(b)), [])
  : [arr]

export const kebabCase = (str) => trim(dash(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-')
export const snakeCase = (str) => trim(snake(str.replace(/[^a-zA-Z0-9_-]/g, '-')), '_-')

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

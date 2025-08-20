import snakeCase from 'lodash/snakeCase'
import camelCase from 'lodash/camelCase'
import dayjs from 'dayjs/dayjs.min'
import advancedFormat from 'dayjs/plugin/advancedFormat'
dayjs.extend(advancedFormat)
const now = (format = 'YYYY-MM-DD HH:mm:ss') => dayjs().format(format)
const getRelationName = (relationMethod) => {
    // 'relation' length 8
    return snakeCase(relationMethod.substring(8))
}
const getScopeName = (scopeMethod) => {
    // 'scope' length 5
    return snakeCase(scopeMethod.substring(5))
}
const getRelationMethod = (relation) => {
    return camelCase(`relation_${relation}`)
}
const getScopeMethod = (scope) => {
    return camelCase(`scope_${scope}`)
}
const getAttrMethod = (attr) => {
    return camelCase(`attribute_${attr}`)
}
const getGetterMethod = (attr) => {
    return camelCase(`get_${attr}_attribute`)
}
const getSetterMethod = (attr) => {
    return camelCase(`set_${attr}_attribute`)
}
const getAttrName = (attrMethod) => {
    return attrMethod.substring(3, attrMethod.length - 9).toLowerCase()
}
const tap = (instance, callback) => {
    const result = callback(instance)
    return result instanceof Promise ? result.then(() => instance) : instance
}
const compose = (Base, ...mixins) => {
    return mixins.reduce((Class, mixinFunc) => {
        return mixinFunc(Class)
    }, Base)
}
export { now }
export { getRelationName }
export { getScopeName }
export { getRelationMethod }
export { getScopeMethod }
export { getAttrMethod }
export { getGetterMethod }
export { getSetterMethod }
export { getAttrName }
export { compose }
export { tap }
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

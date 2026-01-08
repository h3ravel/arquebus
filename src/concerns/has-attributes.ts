import type { MixinConstructor, TGeneric } from 'types/generics'
import { flat as flatten, omit } from 'radashi'
import {
  flattenDeep,
  getAttrMethod,
  getGetterMethod,
  getSetterMethod,
} from '../utils'

import CastsAttributes from '../casts-attributes'
import collect from 'collect.js'
import dayjs from 'dayjs'

const HasAttributes = <TBase extends MixinConstructor> (Model: TBase) => {
  return class extends Model {
    static castTypeCache: TGeneric = {}
    attributes: TGeneric = {}
    original: TGeneric = {}
    casts: TGeneric<
      | typeof CastsAttributes
      | 'int'
      | 'json'
      | 'string'
      | 'date'
      | 'boolean'
      | 'datetime'
      | 'collection'
    > = {}
    changes: TGeneric = {}
    appends: any[] = []

    setAppends (appends: any[]) {
      this.appends = appends
      return this
    }
    append (...keys: any[]) {
      const appends = flattenDeep(keys)
      this.appends = [...this.appends, ...appends]
      return this
    }
    normalizeCastClassResponse (key: string, value: string): TGeneric {
      return value?.constructor?.name === 'Object'
        ? (value as unknown as TGeneric)
        : {
          [key]: value,
        }
    }
    syncOriginal () {
      this.original = this.getAttributes()
      return this
    }
    syncChanges () {
      this.changes = this.getDirty()
      return this
    }
    syncOriginalAttribute (attribute: string) {
      this.syncOriginalAttributes(attribute)
    }
    syncOriginalAttributes (...attributes: string[]) {
      attributes = flattenDeep(attributes)
      const modelAttributes = this.getAttributes()
      for (const attribute of attributes) {
        this.original[attribute] = modelAttributes[attribute]
      }
      return this
    }
    isDirty (...attributes: string[]) {
      const changes = this.getDirty()
      attributes = flattenDeep(attributes)
      if (attributes.length === 0) {
        return Object.keys(changes).length > 0
      }
      for (const attribute of attributes) {
        if (attribute in changes) {
          return true
        }
      }
      return false
    }
    getDirty () {
      const dirty: TGeneric = {}
      const attributes = this.getAttributes()
      for (const key in attributes) {
        const value = attributes[key]
        if (!this.originalIsEquivalent(key)) {
          dirty[key] = value
        }
      }
      return dirty
    }
    originalIsEquivalent (key: string) {
      if (this.original[key] === undefined) {
        return false
      }
      const attribute = this.attributes[key]
      const original = this.original[key]
      if (attribute === original) {
        return true
      } else {
        return false
      }
    }
    setAttributes (attributes: TGeneric) {
      this.attributes = { ...attributes }
    }
    setRawAttributes (attributes: TGeneric, sync = false) {
      this.attributes = attributes
      if (sync) {
        this.syncOriginal()
      }
      return this
    }
    getAttributes () {
      return { ...this.attributes }
    }
    setAttribute (key: string, value: string) {
      const setterMethod = getSetterMethod(key)
      if (typeof this[setterMethod] === 'function') {
        this[setterMethod](value)
        return this
      }
      const attrMethod = getAttrMethod(key)
      if (typeof this[attrMethod] === 'function') {
        const attribute = this[attrMethod]()
        const callback =
          attribute.set ||
          ((value: any) => {
            this.attributes[key] = value
          })
        this.attributes = {
          ...this.attributes,
          ...this.normalizeCastClassResponse(
            key,
            callback(value, this.attributes),
          ),
        }
        return this
      }
      const casts = this.getCasts()

      const castType = casts[key]
      if (this.isCustomCast(castType) && typeof castType !== 'string') {
        value = castType.set(this as never, key, value, this.attributes) ?? ''
      }
      if (castType === 'json') {
        value = JSON.stringify(value)
      }
      if (castType === 'collection') {
        value = JSON.stringify(value)
      }
      if (value !== null && this.isDateAttribute(key)) {
        value = this.fromDateTime(value)
      }
      this.attributes[key] = value
      return this
    }
    getAttribute (key: string) {
      if (!key) {
        return
      }
      const getterMethod = getGetterMethod(key)
      if (typeof this[getterMethod] === 'function') {
        return this[getterMethod](this.attributes[key], this.attributes)
      }
      const attrMethod = getAttrMethod(key)
      if (typeof this[attrMethod] === 'function') {
        const caster = this[attrMethod]()
        return caster.get(this.attributes[key], this.attributes)
      }
      if (key in this.attributes) {
        if (this.hasCast(key)) {
          return this.castAttribute(key, this.attributes[key])
        }
        if (this.getDates().includes(key)) {
          return this.asDateTime(this.attributes[key])
        }
        return this.attributes[key]
      }
      if (key in this.relations) {
        return this.relations[key]
      }
      return
    }
    castAttribute (key: string, value: string) {
      const castType = this.getCastType(key)
      if (!castType) {
        return value
      }
      if (value === null) {
        return value
      }
      switch (castType) {
        case 'int':
        case 'integer':
          return parseInt(value)
        case 'real':
        case 'float':
        case 'double':
          return parseFloat(value)
        case 'decimal':
          return this.asDecimal(value, castType.split(':')[1])
        case 'string':
          return String(value)
        case 'bool':
        case 'boolean':
          return Boolean(value)
        case 'object':
        case 'json':
          try {
            return JSON.parse(value)
          } catch {
            return null
          }
        case 'collection':
          try {
            return collect(JSON.parse(value))
          } catch {
            return collect([])
          }
        case 'date':
          return this.asDate(value)
        case 'datetime':
        case 'custom_datetime':
          return this.asDateTime(value)
        case 'timestamp':
          return this.asTimestamp(value)
      }
      if (this.isCustomCast(castType)) {
        return castType.get(this, key, value, this.attributes)
      }
      return value
    }
    attributesToData () {
      let attributes = { ...this.attributes }
      for (const key in attributes) {
        if (this.hidden.includes(key)) {
          attributes = omit(attributes, [key])
        }
        if (this.visible.length > 0 && this.visible.includes(key) === false) {
          attributes = omit(attributes, [key])
        }
      }
      for (const key of this.getDates()) {
        if (attributes[key] === undefined) {
          continue
        }
        attributes[key] = this.serializeDate(this.asDateTime(attributes[key]))
      }
      const casts = this.getCasts()
      for (const key in casts) {
        const value = casts[key]
        if (key in attributes === false) {
          continue
        }
        attributes[key] = this.castAttribute(key, attributes[key])
        if (key in attributes && ['date', 'datetime'].includes(String(value))) {
          attributes[key] = this.serializeDate(attributes[key])
        }
        if (key in attributes && this.isCustomDateTimeCast(value)) {
          attributes[key] = dayjs(attributes[key]).format(
            String(value).split(':')[1],
          )
        }
      }
      for (const key of this.appends) {
        attributes[key] = this.mutateAttribute(key, null)
      }
      return attributes
    }
    mutateAttribute (key: string, value: string | null) {
      if (typeof this[getGetterMethod(key)] === 'function') {
        return this[getGetterMethod(key)](value)
      } else if (typeof this[getAttrMethod(key)] === 'function') {
        const caster = this[getAttrMethod(key)]()
        return caster.get(key, this.attributes)
      } else if (key in this) {
        return this[key]
      }
      return value
    }
    mutateAttributeForArray (_key: string, _value: string) { }
    isDateAttribute (key: string) {
      return this.getDates().includes(key) || this.isDateCastable(key)
    }
    serializeDate (date?: Date | string | null) {
      return date ? dayjs(date).toISOString() : null
    }
    getDates () {
      return this.usesTimestamps()
        ? [this.getCreatedAtColumn(), this.getUpdatedAtColumn()]
        : []
    }
    getCasts () {
      if (this.getIncrementing()) {
        return {
          [this.getKeyName()]: this.getKeyType(),
          ...this.casts,
        }
      }
      return this.casts
    }
    getCastType (key: string) {
      const castType = this.getCasts()[key]
      let castTypeCacheKey
      if (typeof castType === 'string') {
        castTypeCacheKey = castType
      } else if (new castType() instanceof CastsAttributes) {
        castTypeCacheKey = castType.name
      }
      if (
        castTypeCacheKey &&
        this.getConstructor().castTypeCache[castTypeCacheKey] !== undefined
      ) {
        return this.getConstructor().castTypeCache[castTypeCacheKey]
      }
      let convertedCastType
      if (this.isCustomDateTimeCast(castType)) {
        convertedCastType = 'custom_datetime'
      } else if (this.isDecimalCast(castType)) {
        convertedCastType = 'decimal'
      } else if (this.isCustomCast(castType)) {
        convertedCastType = castType
      } else {
        convertedCastType = String(castType).toLocaleLowerCase().trim()
      }
      return (this.getConstructor()[castTypeCacheKey!] = convertedCastType)
    }
    hasCast (key: string, types: readonly string[] = []) {
      if (key in this.casts) {
        types = flatten(types as unknown as readonly string[][])
        return types.length > 0 ? types.includes(this.getCastType(key)) : true
      }
      return false
    }
    withDayjs (date: string) {
      return dayjs(date)
    }
    isCustomCast (cast: any) {
      return typeof cast === 'function' && new cast() instanceof CastsAttributes
    }
    isCustomDateTimeCast (cast: any) {
      if (typeof cast !== 'string') {
        return false
      }
      return cast.startsWith('date:') || cast.startsWith('datetime:')
    }
    isDecimalCast (cast: any) {
      if (typeof cast !== 'string') {
        return false
      }
      return cast.startsWith('decimal:')
    }
    isDateCastable (key: string) {
      return this.hasCast(key, ['date', 'datetime'])
    }
    fromDateTime (value: string) {
      return dayjs(this.asDateTime(value)).format(this.getDateFormat())
    }
    getDateFormat () {
      return this.dateFormat || 'YYYY-MM-DD HH:mm:ss'
    }
    asDecimal (value: string, decimals: number) {
      return parseFloat(value).toFixed(decimals)
    }
    asDateTime (value: any) {
      if (value === null) {
        return null
      }
      if (value instanceof Date) {
        return value
      }
      if (typeof value === 'number') {
        return new Date(value * 1000)
      }
      return new Date(value)
    }
    asDate (value: string) {
      const date = this.asDateTime(value)
      return dayjs(date).startOf('day').toDate()
    }
  }
}

export default HasAttributes

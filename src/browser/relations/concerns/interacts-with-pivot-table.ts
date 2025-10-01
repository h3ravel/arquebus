import type { MixinConstructor, TGeneric } from 'types/generics'
import { assign, isArray } from 'radashi'

import Collection from '../../collection'
import Model from '../../model'
import { collect } from 'collect.js'

const InteractsWithPivotTable = <TBase extends MixinConstructor> (
  Relation: TBase,
): MixinConstructor => {
  return class extends Relation {
    newExistingPivot (attributes = []) {
      return this.newPivot(attributes, true)
    }
    newPivot (attributes = [], exists = false) {
      const pivot = this.related.newPivot(
        this.parent,
        attributes,
        this.getTable(),
        exists,
        this.using,
      )
      return pivot.setPivotKeys(this.foreignPivotKey, this.relatedPivotKey)
    }
    syncWithoutDetaching (ids: (string | number)[]) {
      return this.sync(ids, false)
    }
    syncWithPivotValues (
      ids: (string | number)[],
      values: any,
      detaching = true,
    ) {
      return this.sync(
        collect(this.parseIds(ids)).mapWithKeys((id: string | number) => {
          return [id, values]
        }),
        detaching,
      )
    }
    withPivot (...columns: any[]) {
      this.pivotColumns = this.pivotColumns.concat(columns)
      return this
    }
    addTimestampsToAttachment (record: TGeneric, exists = false) {
      let fresh = this.parent.freshTimestamp()
      if (this.using) {
        const pivotModel = new this.using()
        fresh = pivotModel.fromDateTime(fresh)
      }
      if (!exists && this.hasPivotColumn(this.createdAt())) {
        record[this.createdAt()] = fresh
      }
      if (this.hasPivotColumn(this.updatedAt())) {
        record[this.updatedAt()] = fresh
      }
      return record
    }
    formatRecordsList (records: any) {
      return collect(records)
        .mapWithKeys((attributes: TGeneric, id: any) => {
          if (!isArray(attributes)) {
            ;[id, attributes] = [attributes, {}]
          }
          return [id, attributes]
        })
        .all()
    }
    castKeys (keys: string[]) {
      return keys.map((v) => {
        return this.castKey(v)
      })
    }
    castKey (key: string) {
      return this.getTypeSwapValue(this.related.getKeyType(), key)
    }
    getTypeSwapValue (type: string, value: any) {
      switch (type.toLowerCase()) {
        case 'int':
        case 'integer':
          return parseInt(value)
        case 'real':
        case 'float':
        case 'double':
          return parseFloat(value)
        case 'string':
          return String(value)
        default:
          return value
      }
    }
    formatAttachRecords (ids: (string | number)[], attributes: TGeneric) {
      const records = []
      const hasTimestamps =
        this.hasPivotColumn(this.createdAt()) ||
        this.hasPivotColumn(this.updatedAt())
      for (const key in ids) {
        const value = ids[key]
        records.push(
          this.formatAttachRecord(key, value, attributes, hasTimestamps),
        )
      }
      return records
    }
    formatAttachRecord (
      key: string,
      value: any,
      attributes: TGeneric,
      hasTimestamps: boolean,
    ) {
      const [id, newAttributes] = this.extractAttachIdAndAttributes(
        key,
        value,
        attributes,
      )
      return assign(this.baseAttachRecord(id, hasTimestamps), newAttributes)
    }
    baseAttachRecord (id: string | number, timed: boolean) {
      let record: TGeneric = {}

      record[this.relatedPivotKey] = id
      record[this.foreignPivotKey] = this.parent[this.parentKey]
      if (timed) {
        record = this.addTimestampsToAttachment(record)
      }
      this.pivotValues.map((value: any) => {
        record[value.column] = value.value
      })
      return record
    }
    extractAttachIdAndAttributes (
      key: string,
      value: any,
      newAttributes: TGeneric,
    ) {
      return isArray(value)
        ? [key, { ...value, ...newAttributes }]
        : [value, newAttributes]
    }
    hasPivotColumn (column: string) {
      return this.pivotColumns.includes(column)
    }
    parseIds (value: any) {
      if (value instanceof Model) {
        return [value[this.relatedKey]]
      }
      if (value instanceof Collection) {
        return value.pluck(this.relatedKey).all()
      }
      return isArray(value) ? value : [value]
    }
  }
}
export default InteractsWithPivotTable

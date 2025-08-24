import type { MixinConstructor, TGeneric } from 'types/generics'
import { Model, Pivot } from '../../model'
import { assign, diff as difference, isArray } from 'radashi'

import Collection from '../../collection'
import { collect } from 'collect.js'

const InteractsWithPivotTable = <TBase extends MixinConstructor> (Relation: TBase): MixinConstructor => {
  return class extends Relation {
    newExistingPivot (attributes = []) {
      return this.newPivot(attributes, true)
    }
    newPivot (attributes: any[] = [], exists = false) {
      const pivot = this.related.newPivot(this.parent, attributes, this.getTable(), exists, this.using)
      return pivot.setPivotKeys(this.foreignPivotKey, this.relatedPivotKey)
    }
    async attach (id: string | number, attributes = {}, _touch = true) {
      if (this.using) {
        await this.attachUsingCustomClass(id, attributes)
      }
      else {
        await this.newPivotStatement().insert(this.formatAttachRecords(this.parseIds(id), attributes))
      }
      // if (touch) {
      //   this.touchIfTouching();
      // }
    }
    async detach (ids?: (string | number)[], _touch = true) {
      let results
      if (this.using &&
        ids !== null &&
        this.pivotWheres.length == 0 &&
        this.pivotWhereIns.length == 0 &&
        this.pivotWhereNulls.length == 0) {
        results = await this.detachUsingCustomClass(ids)
      }
      else {
        const query = this.newPivotQuery()
        if (ids !== null) {
          ids = this.parseIds(ids)
          if (ids.length == 0) {
            return 0
          }
          query.whereIn(this.getQualifiedRelatedPivotKeyName(), ids)
        }
        results = await query.delete()
      }
      // if (touch) {
      //   this.touchIfTouching();
      // }
      return results
    }
    async sync<S = any> (ids?: S[] | S, detaching = true) {
      let changes: TGeneric<Model[]> = {
        attached: [],
        detached: [],
        updated: [],
      }
      let records: any[]
      const results = await this.getCurrentlyAttachedPivots()
      const current = results.length === 0
        ? []
        : results.map((result: any) => result.toData()).pluck(this.relatedPivotKey).all().map((i: number) => String(i))
      const detach = difference(current, Object.keys(records = this.formatRecordsList(this.parseIds(ids) as any)))
      if (detaching && detach.length > 0) {
        await this.detach(detach)
        changes.detached = this.castKeys(detach)
      }
      changes = assign(changes, await this.attachNew(records, current, false)) as any
      return changes
    }
    syncWithoutDetaching (ids: (string | number)[]) {
      return this.sync(ids, false)
    }
    syncWithPivotValues (ids: string[], values: any, detaching = true) {
      return this.sync(collect(this.parseIds(ids))
        .mapWithKeys((id: string | number) => {
          return [id, values]
        }), detaching)
    }
    withPivot (columns: any) {
      this.pivotColumns = this.pivotColumns.concat(isArray(columns) ? columns : Array.prototype.slice.call(columns))
      return this
    }
    async attachNew (records: TGeneric, current: any[], touch = true) {
      const changes: TGeneric<Model[]> = {
        attached: [],
        updated: []
      }
      for (const id in records) {
        const attributes = records[id]
        if (!current.includes(id)) {
          await this.attach(id, attributes, touch)
          changes.attached.push(this.castKey(id))
        }
        else if (Object.keys(attributes).length > 0 && await this.updateExistingPivot(id, attributes, touch)) {
          changes.updated.push(this.castKey(id))
        }
      }
      return changes
    }
    async updateExistingPivot (id: string | number, attributes: TGeneric, touch = true) {
      if (this.using &&
        this.pivotWheres.length > 0 &&
        this.pivotWhereInspivotWheres.length > 0 &&
        this.pivotWhereNullspivotWheres.length > 0) {
        return await this.updateExistingPivotUsingCustomClass(id, attributes, touch)
      }
      if (this.hasPivotColumn(this.updatedAt())) {
        attributes = this.addTimestampsToAttachment(attributes, true)
      }
      const updated = this.newPivotStatementForId(this.parseId(id)).update(this.castAttributes(attributes))
      // if (touch) {
      //   this.touchIfTouching();
      // }
      return updated
    }
    addTimestampsToAttachment (record: TGeneric, exists = false) {
      let fresh = this.parent.freshTimestamp()
      if (this.using) {
        const pivotModel = new this.using
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
    async updateExistingPivotUsingCustomClass (this: any, id: number | string, attributes: TGeneric, _touch: boolean) {
      const pivot = await this.getCurrentlyAttachedPivots()
        .where(this.foreignPivotKey, this.parent[this.parentKey])
        .where(this.relatedPivotKey, this.parseId(id))
        .first()
      const updated = pivot ? pivot.fill(attributes).isDirty() : false
      if (updated) {
        await pivot.save()
      }
      // if (touch) {
      //   this.touchIfTouching();
      // }
      return parseInt(updated)
    }
    formatRecordsList<X> (records: X[]) {
      return collect(records).mapWithKeys((attributes: any, id: any) => {
        if (!isArray(attributes)) {
          [id, attributes] = [attributes, {}]
        }
        return [id, attributes]
      }).all()
    }
    async getCurrentlyAttachedPivots () {
      const query = this.newPivotQuery()
      const results = await query.get()
      return results.map((record: any) => {
        const modelClass = this.using || Pivot
        const pivot = modelClass.fromRawAttributes(this.parent, record, this.getTable(), true)
        return pivot.setPivotKeys(this.foreignPivotKey, this.relatedPivotKey)
      })
    }
    castKeys (keys: string[]) {
      return keys.map(v => {
        return this.castKey(v)
      })
    }
    castKey<T> (key: T) {
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
    newPivotQuery () {
      const query = this.newPivotStatement()
      this.pivotWheres.map((args: any) => {
        query.where(...args)
      })
      this.pivotWhereIns.map((args: any) => {
        query.whereIn(...args)
      })
      this.pivotWhereNulls.map((args: any) => {
        query.whereNull(...args)
      })
      return query.where(this.getQualifiedForeignPivotKeyName(), this.parent[this.parentKey])
    }
    async detachUsingCustomClass (ids?: (string | number)[]) {
      let results = 0
      for (const id in this.parseIds(ids)) {
        results += await this.newPivot({
          [this.foreignPivotKey]: this.parent[this.parentKey],
          [this.relatedPivotKey]: id,
        } as any, true).delete()
      }
      ;
      return results
    }
    newPivotStatement () {
      const builder = this.parent.newQuery()
      builder.setTable(this.table)
      return builder
    }
    async attachUsingCustomClass (id: string | number, attributes: TGeneric) {
      const records = this.formatAttachRecords(this.parseIds(id), attributes)
      await Promise.all(records.map(async (record: any) => {
        await this.newPivot(record, false).save()
      }))
    }
    formatAttachRecords (ids: (string | number)[], attributes: TGeneric) {
      const records = []
      const hasTimestamps = (this.hasPivotColumn(this.createdAt()) || this.hasPivotColumn(this.updatedAt()))
      for (const key in ids) {
        const value = ids[key]
        records.push(this.formatAttachRecord(key, value, attributes, hasTimestamps))
      }
      return records
    }
    formatAttachRecord (key: string, value: any, attributes: any, hasTimestamps: any) {
      const [id, newAttributes] = this.extractAttachIdAndAttributes(key, value, attributes)
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

    extractAttachIdAndAttributes (key: string, value: any, newAttributes: TGeneric) {
      return isArray(value)
        ? [key, { ...value, ...newAttributes }]
        : [value, newAttributes]
    }

    hasPivotColumn (column: string) {
      return this.pivotColumns.includes(column)
    }

    parseIds<I = any> (value: I) {
      if (value instanceof Model) {
        return [value[this.relatedKey]]
      }
      if (value instanceof Collection) {
        return value.pluck(this.relatedKey).all() as I[]
      }
      return isArray(value) ? value : [value]
    }
  }
}
export default InteractsWithPivotTable

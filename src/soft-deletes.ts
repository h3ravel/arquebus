import type { MixinConstructor, TFunction } from 'types/generics'

import SoftDeletingScope from './soft-deleting-scope'
import { isNullish } from 'radashi'
import { tap } from './utils'

const softDeletes = <TBase extends MixinConstructor> (Model: TBase) => {
  return class extends Model {
    forceDeleting = false
    static bootSoftDeletes (this: typeof Model.prototype) {
      this.addGlobalScope(new SoftDeletingScope)
    }
    initialize (this: typeof Model.prototype) {
      super.initialize()
      this.constructor.bootSoftDeletes()
      this.addPluginInitializer('initializeSoftDeletes')
    }
    initializeSoftDeletes () {
      if (this.casts[this.getDeletedAtColumn()] === undefined) {
        this.casts[this.getDeletedAtColumn()] = 'datetime'
      }
    }
    async forceDelete () {
      if (this.execHooks('forceDeleting') === false) {
        return false
      }
      this.forceDeleting = true
      return tap(await this.delete(), (deleted) => {
        this.forceDeleting = false
        if (deleted) {
          this.execHooks('forceDeleted', false)
        }
      })
    }
    forceDeleteQuietly () {
      return this.withoutEvents(() => this.forceDelete())
    }
    async performDeleteOnModel (options = {}) {
      if (this.forceDeleting) {
        return tap(await this.setKeysForSaveQuery(this.newModelQuery()).forceDelete(), () => {
          this.exists = false
        })
      }
      return await this.runSoftDelete(options)
    }
    async runSoftDelete (options = {}) {
      const query = this.setKeysForSaveQuery(this.newModelQuery())
      const time = this.freshTimestamp()
      const columns = {
        [this.getDeletedAtColumn()]: this.fromDateTime(time)
      }
      this[this.getDeletedAtColumn()] = time
      if (this.usesTimestamps() && this.getUpdatedAtColumn()) {
        this[this.getUpdatedAtColumn()] = time
        columns[this.getUpdatedAtColumn()] = this.fromDateTime(time)
      }
      await query.update(columns)
      this.syncOriginalAttributes(Object.keys(columns))
      this.execHooks('trashed', options)
    }
    async restore (options = {}) {
      if (this.execHooks('restoring', options) === false) {
        return false
      }
      this[this.getDeletedAtColumn()] = null
      this.exists = true
      const result = await this.save()
      this.execHooks('restored', options)
      return result
    }
    restoreQuietly () {
      return this.withoutEvents(() => this.restore())
    }
    trashed () {
      return !isNullish(this[this.getDeletedAtColumn()])
    }
    static softDeleted (this: typeof Model.prototype, callback: TFunction) {
      this.addHook('trashed', callback)
    }
    static restoring (this: typeof Model.prototype, callback: TFunction) {
      this.addHook('restoring', callback)
    }
    static restored (this: typeof Model.prototype, callback: TFunction) {
      this.addHook('restored', callback)
    }
    static forceDeleting (this: typeof Model.prototype, callback: TFunction) {
      this.addHook('forceDeleting', callback)
    }
    static forceDeleted (this: typeof Model.prototype, callback: TFunction) {
      this.addHook('forceDeleted', callback)
    }
    isForceDeleting () {
      return this.forceDeleting
    }
    getDeletedAtColumn (this: typeof Model.prototype) {
      return this.constructor.DELETED_AT || 'deleted_at'
    }
    getQualifiedDeletedAtColumn () {
      return this.qualifyColumn(this.getDeletedAtColumn())
    }
  }
}
export default softDeletes

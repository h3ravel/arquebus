import type { MixinConstructor, TFunction, TGeneric } from 'types/generics'

import Hooks from '../hooks'

const HasHooks = <TBase extends MixinConstructor> (Model: TBase) => {
  return class extends Model {
    static hooks: Hooks | null = null
    static addHook (hook: any, callback: TFunction) {
      if (this.hooks instanceof Hooks === false) {
        this.hooks = new Hooks
      }
      this.hooks.add(hook, callback)
    }
    static creating (callback: TFunction) {
      this.addHook('creating', callback)
    }
    static created (callback: TFunction) {
      this.addHook('created', callback)
    }
    static updating (callback: TFunction) {
      this.addHook('updating', callback)
    }
    static updated (callback: TFunction) {
      this.addHook('updated', callback)
    }
    static saving (callback: TFunction) {
      this.addHook('saving', callback)
    }
    static saved (callback: TFunction) {
      this.addHook('saved', callback)
    }
    static deleting (callback: TFunction) {
      this.addHook('deleting', callback)
    }
    static deleted (callback: TFunction) {
      this.addHook('deleted', callback)
    }
    static restoring (callback: TFunction) {
      this.addHook('restoring', callback)
    }
    static restored (callback: TFunction) {
      this.addHook('restored', callback)
    }
    static trashed (callback: TFunction) {
      this.addHook('trashed', callback)
    }
    static forceDeleted (callback: TFunction) {
      this.addHook('forceDeleted', callback)
    }
    async execHooks (hook: any, options: TGeneric) {
      if ((this.constructor as any).hooks instanceof Hooks === false) {
        return
      }
      return await (this.constructor as any).hooks.exec(hook, [this, options])
    }
  }
}
export default HasHooks

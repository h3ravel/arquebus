import type { MixinConstructor } from 'types/generics'

export const SupportsDefaultModels = <TBase extends MixinConstructor>(
  Relation: TBase,
): MixinConstructor => {
  return class extends Relation {
    _withDefault: any
    withDefault(callback = true) {
      this._withDefault = callback
      return this
    }
    getDefaultFor(parent: any) {
      if (!this._withDefault) {
        return null
      }
      const instance = this.newRelatedInstanceFor(parent)
      if (typeof this._withDefault === 'function') {
        return this._withDefault(instance, parent) || instance
      }
      if (typeof this._withDefault === 'object') {
        for (const key in this._withDefault) {
          instance.setAttribute(key, this._withDefault[key])
        }
      }
      return instance
    }
  }
}
export default SupportsDefaultModels

import type { MixinConstructor } from 'types/generics'

const HasUniqueIds = <TBase extends MixinConstructor>(Model: TBase) => {
  return class extends Model {
    useUniqueIds = true
    uniqueIds() {
      return [this.getKeyName()]
    }
    getKeyType() {
      if (this.uniqueIds().includes(this.getKeyName())) {
        return 'string'
      }
      return this.keyType
    }
    getIncrementing() {
      if (this.uniqueIds().includes(this.getKeyName())) {
        return false
      }
      return this.incrementing
    }
  }
}
export default HasUniqueIds

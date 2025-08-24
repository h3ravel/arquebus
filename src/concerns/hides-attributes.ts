import type { MixinConstructor } from 'types/generics'
import { diff as difference } from 'radashi'
import { flattenDeep } from '../utils'

const HidesAttributes = <TBase extends MixinConstructor> (Model: TBase) => {
  return class extends Model {
    hidden: any[] = []
    visible: any[] = []
    makeVisible (...keys: string[]) {
      const visible = flattenDeep(keys)
      if (this.visible.length > 0) {
        this.visible = [...this.visible, ...visible]
      }
      this.hidden = difference(this.hidden, visible)
      return this
    }
    makeHidden (key: string[], ...keys: string[]) {
      const hidden = flattenDeep([...key, ...keys])
      if (this.hidden.length > 0) {
        this.hidden = [...this.hidden, ...hidden]
      }
      return this
    }
    getHidden () {
      return this.hidden
    }
    getVisible () {
      return this.visible
    }
    setHidden (hidden: any[]) {
      this.hidden = hidden
      return this
    }
    setVisible (visible: any[]) {
      this.visible = visible
      return this
    }
  }
}
export default HidesAttributes

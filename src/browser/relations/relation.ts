import type Model from '../model'

class Relation<M extends Model = Model> {
  parent: any
  related: any
  eagerKeysWereEmpty = false
  static constraints = true
  constructor(related: any, parent: any) {
    this.parent = parent
    this.related = related
  }
  asProxy() {
    const handler = {
      get: function (target: M, prop: string) {
        if (typeof target[prop] !== 'undefined') {
          return target[prop]
        }
        if (typeof prop === 'string') {
          return () => target.asProxy()
        }
      },
    } as any

    return new Proxy(this, handler)
  }
  getRelated() {
    return this.related
  }
}
export default Relation

import type { TGeneric } from 'types/generics'

interface IAttribute {
  get?: null | (<A extends TGeneric>(value: string, attr: A) => string)
  set?:
    | null
    | (<A extends TGeneric>(value: string, attr: A) => string | TGeneric)
}

class Attribute {
  get: IAttribute['get']
  set: IAttribute['set']
  withCaching = false
  withObjectCaching = true
  constructor({ get = null, set = null }: IAttribute) {
    this.get = get
    this.set = set
  }
  static make({ get = null, set = null }: IAttribute) {
    return new Attribute({ get, set })
  }
  static get(get: IAttribute['get']) {
    return new Attribute({ get })
  }
  static set(set: IAttribute['set']) {
    return new Attribute({ set })
  }
  withoutObjectCaching() {
    this.withObjectCaching = false
    return this
  }
  shouldCache() {
    this.withCaching = true
    return this
  }
}
export default Attribute

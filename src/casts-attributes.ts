import type Model from 'src/model'
import type { TGeneric } from 'types/generics'

export interface ICastsAttributes {
  get?(
    model: Model,
    key: string,
    value: string,
    attributes: TGeneric,
  ): string | null | undefined
  set?(
    model: Model,
    key: string,
    value: string,
    attributes: TGeneric,
  ): string | null | undefined
}

class CastsAttributes implements ICastsAttributes {
  constructor() {
    if (this.constructor === CastsAttributes) {
      throw new Error('CastsAttributes cannot be instantiated')
    }
  }
  static get(
    _model: Model,
    _key: string,
    _value: string,
    _attributes: TGeneric,
  ): string | null | undefined {
    throw new Error('get not implemented')
  }
  static set(
    _model: Model,
    _key: string,
    _value: string,
    _attributes: TGeneric,
  ): string | null | undefined {
    throw new Error('set not implemented')
  }
}
export default CastsAttributes

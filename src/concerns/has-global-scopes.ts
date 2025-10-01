import type { MixinConstructor, TGeneric } from 'types/generics'
import { get, set } from 'radashi'

import { InvalidArgumentError } from '../errors'
import Scope from '../scope'

const HasGlobalScopes = <TBase extends MixinConstructor>(Model: TBase) => {
  return class extends Model {
    static globalScopes?: TGeneric
    static addGlobalScope(scope: any, implementation: any | null = null) {
      if (typeof scope === 'string' && implementation instanceof Scope) {
        this.globalScopes = set(
          this.globalScopes ?? {},
          this.name + '.' + scope,
          implementation,
        )
        return implementation
      } else if (scope instanceof Scope) {
        this.globalScopes = set(
          this.globalScopes ?? {},
          this.name + '.' + scope.constructor.name,
          scope,
        )
        return scope
      }
      throw new InvalidArgumentError(
        'Global scope must be an instance of Scope.',
      )
    }
    static hasGlobalScope(scope: any) {
      return this.getGlobalScope(scope) !== null
    }
    static getGlobalScope(scope: any) {
      if (typeof scope === 'string') {
        return get(this.globalScopes, this.name + '.' + scope)
      }
      return get(this.globalScopes, this.name + '.' + scope.constructor.name)
    }
    static getAllGlobalScopes() {
      return this.globalScopes
    }
    static setAllGlobalScopes(scopes: TGeneric) {
      this.globalScopes = scopes
    }
    getGlobalScopes() {
      return get(
        (this.constructor as any).globalScopes,
        this.constructor.name,
        {},
      )
    }
  }
}
export default HasGlobalScopes

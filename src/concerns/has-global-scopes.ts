import type { MixinConstructor, TGeneric } from 'types/generics'
import { data_get, data_set } from '@h3ravel/support'

import { InvalidArgumentError } from '../errors'
import Scope from '../scope'

const HasGlobalScopes = <TBase extends MixinConstructor>(Model: TBase) => {
  return class extends Model {
    static globalScopes?: TGeneric
    static addGlobalScope(scope: any, implementation: any | null = null) {
      if (typeof scope === 'string' && implementation instanceof Scope) {
        const scopes = this.globalScopes ?? {}
        data_set(scopes, this.name + '.' + scope, implementation)
        this.globalScopes = scopes
        return implementation
      } else if (scope instanceof Scope) {
        const scopes = this.globalScopes ?? {}
        data_set(scopes, this.name + '.' + scope.constructor.name, scope)
        this.globalScopes = scopes
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
        return data_get(this.globalScopes ?? {}, this.name + '.' + scope)
      }
      return data_get(this.globalScopes ?? {}, this.name + '.' + scope.constructor.name)
    }
    static getAllGlobalScopes() {
      return this.globalScopes
    }
    static setAllGlobalScopes(scopes: TGeneric) {
      this.globalScopes = scopes
    }
    getGlobalScopes() {
      return data_get(
        (this.constructor as any).globalScopes ?? {},
        this.constructor.name,
        {},
      )
    }
  }
}
export default HasGlobalScopes

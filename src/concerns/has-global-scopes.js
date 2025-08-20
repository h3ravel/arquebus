import { InvalidArgumentError } from 'src/errors'
import Scope from 'src/scope'
import get from 'lodash/get'
import set from 'lodash/set'
const HasGlobalScopes = (Model) => {
  return class extends Model {
    static addGlobalScope (scope, implementation = null) {
      if (typeof scope === 'string' && implementation instanceof Scope) {
        set(this.globalScopes, this.name + '.' + scope, implementation)
        return implementation
      }
      else if (scope instanceof Scope) {
        set(this.globalScopes, this.name + '.' + scope.constructor.name, scope)
        return scope
      }
      throw new InvalidArgumentError('Global scope must be an instance of Scope.')
    }
    static hasGlobalScope (scope) {
      return this.getGlobalScope(scope) !== null
    }
    static getGlobalScope (scope) {
      if (typeof scope === 'string') {
        return get(this.globalScopes, this.name + '.' + scope)
      }
      return get(this.globalScopes, this.name + '.' + scope.constructor.name)
    }
    static getAllGlobalScopes () {
      return this.globalScopes
    }
    static setAllGlobalScopes (scopes) {
      this.globalScopes = scopes
    }
    getGlobalScopes () {
      return get(this.constructor.globalScopes, this.constructor.name, {})
    }
  }
}
export default HasGlobalScopes

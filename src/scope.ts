import type Builder from 'src/builder'
import type { IScope } from 'types/builder'
import type Model from 'src/model'

class Scope<M extends Model = Model> implements IScope {
    constructor() {
        if (this.constructor === Scope) {
            throw new Error('Scope cannot be instantiated')
        }
    }
    apply (_builder: Builder<M>, _model: M) {
        throw new Error('apply not implemented')
    }
}
export default Scope

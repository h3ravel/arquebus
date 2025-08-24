import type { IModel } from 'types/modeling'
import { isArray } from 'radashi'
class BaseError extends Error {
  constructor(message: string, _entity?: any) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
class ModelNotFoundError extends BaseError {
  model?: IModel
  ids: (string | number)[] | string | number = []
  constructor() { super('') }
  setModel (model: IModel, ids = []) {
    this.model = model
    this.ids = isArray(ids) ? ids : [ids]
    this.message = `No query results for model [${model}]`
    if (this.ids.length > 0) {
      this.message += ' ' + this.ids.join(', ')
    }
    else {
      this.message += '.'
    }
    return this
  }
  getModel () {
    return this.model
  }
  getIds () {
    return this.ids
  }
}
class RelationNotFoundError extends BaseError {
}
class InvalidArgumentError extends BaseError {
}
export { ModelNotFoundError }
export { RelationNotFoundError }
export { InvalidArgumentError }
export default {
  ModelNotFoundError,
  RelationNotFoundError,
  InvalidArgumentError
}

import type Model from '../model'
import Relation from './relation'

class BelongsTo<M extends Model = Model> extends Relation<M> {
  foreignKey: string
  ownerKey: string
  child: string
  relationName: string

  constructor(
    related: any,
    child: any,
    foreignKey: string,
    ownerKey: string,
    relationName: string,
  ) {
    super(related, child)
    this.foreignKey = foreignKey
    this.ownerKey = ownerKey
    this.child = child
    this.relationName = relationName
    return this.asProxy()
  }
}
export default BelongsTo

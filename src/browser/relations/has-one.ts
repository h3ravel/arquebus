import Relation from './relation'

class HasOne extends Relation {
  foreignKey: string
  localKey: string

  constructor(related: any, parent: any, foreignKey: string, localKey: string) {
    super(related, parent)
    this.foreignKey = foreignKey
    this.localKey = localKey
    return this.asProxy()
  }
}
export default HasOne

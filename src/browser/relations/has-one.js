import Relation from './relation'
class HasOne extends Relation {
    foreignKey
    localKey
    constructor(related, parent, foreignKey, localKey) {
        super(related, parent)
        this.foreignKey = foreignKey
        this.localKey = localKey
        return this.asProxy()
    }
}
export default HasOne

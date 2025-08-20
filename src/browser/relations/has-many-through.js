import Relation from './relation'
class HasManyThrough extends Relation {
    throughParent
    farParent
    firstKey
    secondKey
    localKey
    secondLocalKey
    constructor(query, farParent, throughParent, firstKey, secondKey, localKey, secondLocalKey) {
        super(query, throughParent)
        this.localKey = localKey
        this.firstKey = firstKey
        this.secondKey = secondKey
        this.farParent = farParent
        this.throughParent = throughParent
        this.secondLocalKey = secondLocalKey
        return this.asProxy()
    }
}
export default HasManyThrough

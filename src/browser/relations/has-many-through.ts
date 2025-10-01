import Relation from './relation'

class HasManyThrough extends Relation {
  throughParent: any
  farParent: any
  firstKey: string
  secondKey: string
  localKey: string
  secondLocalKey: string

  constructor(
    query: any,
    farParent: any,
    throughParent: any,
    firstKey: string,
    secondKey: string,
    localKey: string,
    secondLocalKey: string,
  ) {
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

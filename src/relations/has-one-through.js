import HasManyThrough from './has-many-through'
import SupportsDefaultModels from './concerns/supports-default-models'
import { compose } from '../utils'
class HasOneThrough extends compose(HasManyThrough, SupportsDefaultModels) {
  async getResults () {
    return (await this.first()) || this.getDefaultFor(this.farParent)
  }
  initRelation (models, relation) {
    for (const model of models) {
      model.setRelation(relation, this.getDefaultFor(model))
    }
    return models
  }
  match (models, results, relation) {
    const dictionary = this.buildDictionary(results)
    for (const model of models) {
      const key = this.getDictionaryKey(model.getAttribute(this.localKey))
      if (dictionary[key] !== undefined) {
        const value = dictionary[key]
        model.setRelation(relation, value[0])
      }
    }
    return models
  }
  newRelatedInstanceFor (parent) {
    return this.related.newInstance()
  }
}
export default HasOneThrough

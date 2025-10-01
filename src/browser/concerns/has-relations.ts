import type { MixinConstructor, TGeneric } from 'types/generics'
import { getRelationMethod, getRelationName, snakeCase } from 'src/utils'

import BelongsTo from 'src/browser/relations/belongs-to'
import BelongsToMany from 'src/browser/relations/belongs-to-many'
import HasMany from 'src/browser/relations/has-many'
import HasManyThrough from 'src/browser/relations/has-many-through'
import HasOne from 'src/browser/relations/has-one'
import HasOneThrough from 'src/browser/relations/has-one-through'
import { RelationNotFoundError } from 'src/errors'
import { omit } from 'radashi'

const HasRelations = <TBase extends MixinConstructor>(Instance: TBase) => {
  return class extends Instance {
    relations: TGeneric = {}
    getRelation(relation: string) {
      return this.relations[relation]
    }
    setRelation(relation: string, value: any) {
      this.relations[relation] = value
      return this
    }
    unsetRelation(relation: string) {
      this.relations = omit(this.relations, [relation])
      return this
    }
    relationLoaded(relation: string) {
      return this.relations[relation] !== undefined
    }
    related(relation: string) {
      if (typeof this[getRelationMethod(relation)] !== 'function') {
        const message = `Model [${this.constructor.name}]'s relation [${relation}] doesn't exist.`
        throw new RelationNotFoundError(message)
      }
      return this[getRelationMethod(relation)]()
    }
    async getRelated(relation: string) {
      return await this.related(relation).getResults()
    }
    relationsToData() {
      const data: TGeneric = {}
      for (const key in this.relations) {
        if (this.hidden.includes(key)) {
          continue
        }
        if (this.visible.length > 0 && this.visible.includes(key) === false) {
          continue
        }
        data[key] =
          this.relations[key] instanceof Array
            ? this.relations[key].map((item) => item.toData())
            : this.relations[key] === null
              ? null
              : this.relations[key].toData()
      }
      return data
    }
    guessBelongsToRelation() {
      const e = new Error()
      const frame = e.stack?.split('\n')[2]
      // let lineNumber = frame.split(":").reverse()[1];
      const functionName = frame?.split(' ')[5]
      return getRelationName(functionName!)
    }
    joiningTable(related: any, instance: typeof this | null = null) {
      const segments = [
        instance ? instance.joiningTableSegment() : snakeCase(related.name),
        this.joiningTableSegment(),
      ]
      return segments.sort().join('_').toLocaleLowerCase()
    }
    joiningTableSegment() {
      return snakeCase(this.constructor.name)
    }
    hasOne(
      related: any,
      foreignKey: string | null = null,
      localKey: string | null = null,
    ) {
      const instance = new related()
      foreignKey = foreignKey || this.getForeignKey()
      localKey = localKey || this.getKeyName()
      return new HasOne(
        related,
        this,
        instance.getTable() + '.' + foreignKey,
        localKey!,
      )
    }
    hasMany(related: any, foreignKey = null, localKey = null) {
      const instance = new related()
      foreignKey = foreignKey || this.getForeignKey()
      localKey = localKey || this.getKeyName()
      return new HasMany(
        related,
        this,
        instance.getTable() + '.' + foreignKey,
        localKey!,
      )
    }
    belongsTo(
      related: any,
      foreignKey: string | null = null,
      ownerKey: string | null = null,
      relation: string | null = null,
    ) {
      const instance = new related()
      foreignKey = foreignKey || instance.getForeignKey()
      ownerKey = ownerKey || instance.getKeyName()
      relation = relation || this.guessBelongsToRelation()
      return new BelongsTo(related, this, foreignKey!, ownerKey!, relation!)
    }
    belongsToMany(
      related: any,
      table: string | null = null,
      foreignPivotKey: string | null = null,
      relatedPivotKey: string | null = null,
      parentKey: string | null = null,
      relatedKey: string | null = null,
    ) {
      const instance = new related()
      const query = related.query()
      table = table || this.joiningTable(related, instance)
      foreignPivotKey = foreignPivotKey || this.getForeignKey()
      relatedPivotKey = relatedPivotKey || instance.getForeignKey()
      parentKey = parentKey || this.getKeyName()
      relatedKey = relatedKey || instance.getKeyName()
      return new BelongsToMany(
        query,
        this,
        table,
        foreignPivotKey!,
        relatedPivotKey!,
        parentKey!,
        relatedKey!,
      )
    }
    hasOneThrough(
      related: any,
      through: any,
      firstKey: string | null = null,
      secondKey: string | null = null,
      localKey: string | null = null,
      secondLocalKey: string | null = null,
    ) {
      through = new through()
      const query = related.query()
      firstKey = firstKey || this.getForeignKey()
      secondKey = secondKey || through.getForeignKey()
      return new HasOneThrough(
        query,
        this,
        through,
        firstKey!,
        secondKey!,
        localKey || this.getKeyName(),
        secondLocalKey || through.getKeyName(),
      )
    }
    hasManyThrough(
      related: any,
      through: any,
      firstKey: string | null = null,
      secondKey: string | null = null,
      localKey: string | null = null,
      secondLocalKey: string | null = null,
    ) {
      through = new through()
      const query = related.query()
      firstKey = firstKey || this.getForeignKey()
      secondKey = secondKey || through.getForeignKey()
      return new HasManyThrough(
        query,
        this,
        through,
        firstKey!,
        secondKey!,
        localKey || this.getKeyName(),
        secondLocalKey || through.getKeyName(),
      )
    }
  }
}
export default HasRelations

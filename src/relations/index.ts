import IBelongsTo from './belongs-to'
import IBelongsToMany from './belongs-to-many'
import IHasMany from './has-many'
import IHasManyThrough from './has-many-through'
import IHasOne from './has-one'
import IHasOneOrMany from './has-one-or-many'
import IHasOneThrough from './has-one-through'
import IInteractsWithPivotTable from './concerns/interacts-with-pivot-table'
import IRelation from './relation'
import ISupportsDefaultModels from './concerns/supports-default-models'

export const BelongsTo = IBelongsTo
export const BelongsToMany = IBelongsToMany
export const InteractsWithPivotTable = IInteractsWithPivotTable
export const SupportsDefaultModels = ISupportsDefaultModels
export const HasMany = IHasMany
export const HasManyThrough = IHasManyThrough
export const HasOne = IHasOne
export const HasOneOrMany = IHasOneOrMany
export const HasOneThrough = IHasOneThrough
export const Relation = IRelation
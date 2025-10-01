import type Model from '../model'
import Relation from './relation'

class BelongsToMany extends Relation {
  table?: string
  foreignPivotKey?: string
  relatedPivotKey?: string
  parentKey?: string
  relatedKey?: string
  pivotColumns: any[] = []
  pivotValues: any[] = []
  pivotWheres: any[] = []
  pivotWhereIns: any[] = []
  pivotWhereNulls: any[] = []
  accessor: string = 'pivot'
  using!: Model
  pivotCreatedAt?: string | null
  pivotUpdatedAt?: string | null

  constructor(
    related: any,
    parent: any,
    table: string,
    foreignPivotKey: string,
    relatedPivotKey: string,
    parentKey: string,
    relatedKey: string,
  ) {
    super(related, parent)
    this.table = table
    this.foreignPivotKey = foreignPivotKey
    this.relatedPivotKey = relatedPivotKey
    this.parentKey = parentKey
    this.relatedKey = relatedKey
    return this.asProxy()
  }
}
export default BelongsToMany

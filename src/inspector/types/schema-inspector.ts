import type { Column } from 'src/inspector/types/column'
import type { ForeignKey } from 'src/inspector/types/foreign-key'
import type { Knex } from 'knex'
import type { Table } from 'src/inspector/types/table'
import type { UniqueConstraint } from 'src/inspector/types/unique-constraint'

export interface SchemaInspector {
  knex: Knex

  tables(): Promise<string[]>

  tableInfo(): Promise<Table[]>
  tableInfo(table: string): Promise<Table>

  hasTable(table: string): Promise<boolean>

  columns(table?: string): Promise<{ table: string; column: string }[]>

  columnInfo(): Promise<Column[]>
  columnInfo(table?: string): Promise<Column[]>
  columnInfo(table: string, column: string): Promise<Column>

  hasColumn(table: string, column: string): Promise<boolean>
  primary(table: string): Promise<string[] | string | null>

  foreignKeys(table?: string): Promise<ForeignKey[]>

  // Implemented for sqlite, postgresql, mysql
  uniqueConstraints?(table?: string): Promise<UniqueConstraint[]>

  // Not in MySQL
  withSchema?(schema: string): void
}

export interface SchemaInspectorConstructor {
  new (knex: Knex): SchemaInspector
}

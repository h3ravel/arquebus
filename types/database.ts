import type { Collection as ValueCollection } from '@h3ravel/collect.js'
import type { Knex } from 'knex'

export type DatabaseSchema = object
export type TableName<Database extends DatabaseSchema> = Extract<keyof Database, string>
export type TableRow<
  Database extends DatabaseSchema,
  Table extends TableName<Database>,
> = Database[Table]
export type TableColumn<
  Database extends DatabaseSchema,
  Table extends TableName<Database>,
> = Extract<keyof TableRow<Database, Table>, string>

export interface TableBuilder<
  Database extends DatabaseSchema,
  Table extends TableName<Database>,
> {
  where<Column extends TableColumn<Database, Table>>(
    column: Column,
    value: TableRow<Database, Table>[Column] | Knex.Raw,
  ): this
  where<Column extends TableColumn<Database, Table>>(
    column: Column,
    operator: string,
    value: TableRow<Database, Table>[Column] | Knex.Raw,
  ): this
  where(attributes: Partial<TableRow<Database, Table>>): this
  orWhere<Column extends TableColumn<Database, Table>>(
    column: Column,
    value: TableRow<Database, Table>[Column] | Knex.Raw,
  ): this
  whereIn<Column extends TableColumn<Database, Table>>(
    column: Column,
    values: TableRow<Database, Table>[Column][],
  ): this
  whereNull(column: TableColumn<Database, Table>): this
  whereNotNull(column: TableColumn<Database, Table>): this
  select(...columns: (TableColumn<Database, Table> | '*')[]): this
  orderBy(
    column: TableColumn<Database, Table>,
    direction?: 'asc' | 'desc' | 'ASC' | 'DESC',
  ): this
  limit(count: number): this
  offset(count: number): this
  first(columns?: TableColumn<Database, Table>[]): Promise<TableRow<Database, Table> | undefined>
  get(columns?: TableColumn<Database, Table>[]): Promise<TableRow<Database, Table>[]>
  insert(
    rows: Partial<TableRow<Database, Table>> | Partial<TableRow<Database, Table>>[],
  ): Promise<unknown>
  update(values: Partial<TableRow<Database, Table>>): Promise<number>
  delete(): Promise<number>
  count(column?: TableColumn<Database, Table> | '*'): Promise<number>
  min(column: TableColumn<Database, Table>): Promise<number>
  max(column: TableColumn<Database, Table>): Promise<number>
  sum(column: TableColumn<Database, Table>): Promise<number>
  avg(column: TableColumn<Database, Table>): Promise<number>
  pluck<Column extends TableColumn<Database, Table>>(
    column: Column,
  ): Promise<ValueCollection<TableRow<Database, Table>[Column]>>
  clone(): TableBuilder<Database, Table>
}

export interface TypedArquebus<Database extends DatabaseSchema> {
  table<Table extends TableName<Database>>(
    name: Table,
    connection?: string | null,
  ): TableBuilder<Database, Table>
}

import type { MixinConstructor, TFunction, TGeneric } from './generics'

import type { Attribute } from './modeling'
import type Builder from 'src/builder'
import type { Knex } from 'knex'
import type Model from 'src/model'
import type Relation from 'src/relations/relation'
import type { arquebus } from 'src'

export interface TBaseConfig {
  client: 'mysql' | 'mysql2' | 'sqlite3' | 'oracle' | 'mariadb' | 'pg'
  connection: {
    typeCast?(field: TField, next: TFunction): any
    dateStrings?: boolean
  }
  pool?:
    | {
        afterCreate: (
          connection: TConfig,
          callback: (val: any, con: any) => void,
        ) => Promise<any>
      }
    | undefined
  connections?: arquebus['connections']
  migrations?: {
    table: string
    path: string
  }
  factories?: {
    path: string
  }
  seeders?: {
    path: string
  }
  models?: {
    path: string
  }
}

export type TConfig = TBaseConfig &
  (
    | {
        client: 'pg'
        connection: Knex.PgConnectionConfig
      }
    | {
        client: 'oracle'
        connection: Knex.OracleDbConnectionConfig
      }
    | {
        client: 'mysql2'
        connection: Knex.MySql2ConnectionConfig
      }
    | {
        client: 'mysql'
        connection: Knex.MySqlConnectionConfig
      }
    | {
        client: 'sqlite3'
        connection: Knex.Sqlite3ConnectionConfig
        useNullAsDefault?: boolean
      }
    | {
        client: 'mariadb'
        connection: Knex.MariaSqlConnectionConfig
        useNullAsDefault?: boolean
      }
  )

export interface ModelOptions<M extends Model = Model> {
  table?: string
  scopes?: TGeneric<(...args: any[]) => Builder<M>>
  plugins?: (<X extends MixinConstructor<M>>(Model: X) => MixinConstructor<M>)[]
  relations?: TGeneric<(...args: any[]) => Relation>
  attributes?: TGeneric<Attribute>
  CREATED_AT?: string
  UPDATED_AT?: string
  DELETED_AT?: string
  connection?: TBaseConfig['client']
  timestamps?: boolean
  primaryKey?: string
  incrementing?: boolean
  keyType?: 'int' | 'string'
  with?: Model['with']
  casts?: Model['casts']
}

export interface TField {
  type: 'VAR_STRING' | 'BLOB' | 'DATETIME' | 'TIMESTAMP' | 'LONG' | 'JSON'
  length: number
  db: string
  table: string
  name: string
  string: TFunction
  buffer: TFunction
  geometry: TFunction
}

import Cockroachdb from 'src/inspector/dialects/cockroachdb'
import type { Knex } from 'knex'
import Mssql from 'src/inspector/dialects/mssql'
import Mysql from 'src/inspector/dialects/mysql'
import Oracledb from 'src/inspector/dialects/oracledb'
import Postgres from 'src/inspector/dialects/postgres'
import type { SchemaInspectorConstructor } from 'src/inspector/types/schema-inspector'
import Sqlite from 'src/inspector/dialects/sqlite'

export class SchemaInspector {
  public static inspect (knex: Knex) {
    let constructor: SchemaInspectorConstructor

    switch (knex.client.constructor.name) {
      case 'Client_MySQL':
      case 'Client_MySQL2':
        constructor = Mysql
        break
      case 'Client_PG':
        constructor = Postgres
        break
      case 'Client_CockroachDB':
        constructor = Cockroachdb
        break
      case 'Client_SQLite3':
      case 'Client_BetterSQLite3':
        constructor = Sqlite
        break
      case 'Client_Oracledb':
      case 'Client_Oracle':
        constructor = Oracledb
        break
      case 'Client_MSSQL':
        constructor = Mssql
        break

      default:
        throw Error('Unsupported driver used: ' + knex.client.constructor.name)
    }

    return new constructor(knex)
  }
}

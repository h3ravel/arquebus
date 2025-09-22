import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Knex } from 'knex'
import type { SchemaInspector } from 'src/inspector/types/schema-inspector'
import { arquebus } from 'src'
import config from 'test/config'
import { SchemaInspector as schemaInspector } from 'src/inspector'

describe('mysql', () => {
  arquebus.addConnection(config.mysql, config.mysql.client)
  const connection = arquebus.fire(config.mysql.client)

  const schema = (config.mysql.connection as any).database
  const database: Knex = connection.connector
  const inspector: SchemaInspector = schemaInspector.inspect(database)

  beforeAll(async () => {
    await database.raw('SET foreign_key_checks = 0')

    for (const table of await inspector.tables()) {
      await database.schema.dropTableIfExists(table)
    }

    await database.raw('SET foreign_key_checks = 1')
    return database.schema
      .createTable('teams', function (table) {
        table.increments('id')
        table.uuid('uuid').collate('utf8mb4_general_ci').unique().notNullable()
        table.string('name', 100).collate('utf8mb4_general_ci').nullable()
        table.string('name_upper', 100).collate('utf8mb4_general_ci').nullable()
        table.text('description').collate('utf8mb4_general_ci').nullable()
        table.integer('credits', 11).comment('Remaining usage credits').nullable()
        table.datetime('created_at').nullable()
        table.date('activated_at').nullable()
      })
      .createTable('users', function (table) {
        table.increments('id')
        table.integer('team_id').unsigned().unique().notNullable()
        table.string('email', 100).unique({ indexName: 'team_id_email_unique' }).notNullable()
        table.string('password', 60).notNullable()
        table.string('status', 60).defaultTo('active').notNullable()
        table.foreign('team_id', 'fk_team_id').references('id').inTable('teams').onDelete('CASCADE').onUpdate('CASCADE')
      })
      .createTable('page_visits', function (table) {
        table.collate('utf8mb4_general_ci')
        table.string('request_path', 1000).nullable()
        table.string('user_agent', 1000).nullable()
        table.datetime('created_at').nullable()
      })
      .createTable('detailed_page_visits', function (table) {
        table.collate('utf8mb4_general_ci')
        table.string('domain', 100).notNullable()
        table.string('request_path', 100).notNullable()
        table.string('user_agent', 200).nullable()
        table.datetime('created_at').nullable()
        table.primary(['domain', 'request_path'])
      })
  })
  afterAll(async () => {
    await database.destroy()
  })

  describe('.tables', () => {
    it('returns tables', async () => {
      expect(await inspector.tables()).to.deep.equal([
        'teams',
        'users',
        'page_visits',
        'detailed_page_visits',
      ])
    })
  })

  describe('.tableInfo', () => {
    it('returns information for all tables', async () => {
      expect(await inspector.tableInfo()).to.have.deep.members([
        {
          name: 'page_visits',
          schema,
          comment: '',
          collation: 'utf8mb4_general_ci',
          engine: 'InnoDB',
        },
        {
          name: 'teams',
          schema,
          comment: '',
          collation: 'utf8mb4_general_ci',
          engine: 'InnoDB',
        },
        {
          name: 'users',
          schema: schema,
          comment: '',
          collation: 'utf8mb4_general_ci',
          engine: 'InnoDB',
        },
        {
          name: 'detailed_page_visits',
          schema: schema,
          comment: '',
          collation: 'utf8mb4_general_ci',
          engine: 'InnoDB',
        },
      ])
    })

    it('returns information for specific table', async () => {
      expect(await inspector.tableInfo('teams')).to.deep.equal({
        collation: 'utf8mb4_general_ci',
        comment: '',
        engine: 'InnoDB',
        name: 'teams',
        schema: schema,
      })
    })
  })

  describe('.hasTable', () => {
    it('returns if table exists or not', async () => {
      expect(await inspector.hasTable('teams')).to.equal(true)
      expect(await inspector.hasTable('foobar')).to.equal(false)
    })
  })

  describe('.columns', () => {
    it('returns information for all tables', async () => {
      expect(await inspector.columns()).to.have.deep.members([
        { table: 'detailed_page_visits', column: 'domain' },
        { table: 'detailed_page_visits', column: 'request_path' },
        { table: 'detailed_page_visits', column: 'user_agent' },
        { table: 'detailed_page_visits', column: 'created_at' },
        { table: 'page_visits', column: 'request_path' },
        { table: 'page_visits', column: 'user_agent' },
        { table: 'page_visits', column: 'created_at' },
        { table: 'teams', column: 'id' },
        { table: 'teams', column: 'uuid' },
        { table: 'teams', column: 'name' },
        { table: 'teams', column: 'name_upper' },
        { table: 'teams', column: 'description' },
        { table: 'teams', column: 'credits' },
        { table: 'teams', column: 'created_at' },
        { table: 'teams', column: 'activated_at' },
        { table: 'users', column: 'id' },
        { table: 'users', column: 'team_id' },
        { table: 'users', column: 'email' },
        { table: 'users', column: 'password' },
        { table: 'users', column: 'status' },
      ])
    })

    it('returns information for specific table', async () => {
      expect(await inspector.columns('teams')).to.have.deep.members([
        { column: 'id', table: 'teams' },
        { column: 'uuid', table: 'teams' },
        { column: 'name', table: 'teams' },
        { column: 'name_upper', table: 'teams' },
        { column: 'description', table: 'teams' },
        { column: 'credits', table: 'teams' },
        { column: 'created_at', table: 'teams' },
        { column: 'activated_at', table: 'teams' },
      ])
    })
  })

  describe('.columnInfo', () => {
    it('returns information for all columns in all tables', async () => {
      const columnInfo = await inspector.columnInfo()
      expect(columnInfo).to.have.length(20)
      expect(columnInfo).to.deep.include.members([
        {
          name: 'team_id',
          table: 'users',
          collation: null,
          data_type: 'int unsigned',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: 10,
          numeric_scale: 0,
          is_generated: false,
          is_nullable: false,
          is_unique: true,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: 'id',
          foreign_key_table: 'teams',
          comment: ''
        },
        {
          name: 'id',
          table: 'teams',
          collation: null,
          data_type: 'int unsigned',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: 10,
          numeric_scale: 0,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: true,
          has_auto_increment: true,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'uuid',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'char',
          default_value: null,
          generation_expression: null,
          max_length: 36,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: true,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'id',
          table: 'users',
          collation: null,
          data_type: 'int unsigned',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: 10,
          numeric_scale: 0,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: true,
          has_auto_increment: true,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'email',
          table: 'users',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: true,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'domain',
          table: 'detailed_page_visits',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: true,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'request_path',
          table: 'detailed_page_visits',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: true,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'name',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'name_upper',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'description',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'text',
          default_value: null,
          generation_expression: null,
          max_length: 65535,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'credits',
          table: 'teams',
          collation: null,
          data_type: 'int',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: 10,
          numeric_scale: 0,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: 'Remaining usage credits'
        },
        {
          name: 'created_at',
          table: 'teams',
          collation: null,
          data_type: 'datetime',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'activated_at',
          table: 'teams',
          collation: null,
          data_type: 'date',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'password',
          table: 'users',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 60,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'status',
          table: 'users',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: 'active',
          generation_expression: null,
          max_length: 60,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'request_path',
          table: 'page_visits',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 1000,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'user_agent',
          table: 'page_visits',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 1000,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'created_at',
          table: 'page_visits',
          collation: null,
          data_type: 'datetime',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'user_agent',
          table: 'detailed_page_visits',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 200,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'created_at',
          table: 'detailed_page_visits',
          collation: null,
          data_type: 'datetime',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        }
      ])
    })

    it('returns information for all columns in specific table', async () => {
      expect(await inspector.columnInfo('teams')).to.deep.include.members([
        {
          name: 'id',
          table: 'teams',
          collation: null,
          data_type: 'int unsigned',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: 10,
          numeric_scale: 0,
          is_generated: false,
          is_nullable: false,
          is_unique: false,
          is_primary_key: true,
          has_auto_increment: true,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'uuid',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'char',
          default_value: null,
          generation_expression: null,
          max_length: 36,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: false,
          is_unique: true,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'name',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'name_upper',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'varchar',
          default_value: null,
          generation_expression: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'description',
          table: 'teams',
          collation: 'utf8mb4_general_ci',
          data_type: 'text',
          default_value: null,
          generation_expression: null,
          max_length: 65535,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'credits',
          table: 'teams',
          collation: null,
          data_type: 'int',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: 10,
          numeric_scale: 0,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: 'Remaining usage credits'
        },
        {
          name: 'created_at',
          table: 'teams',
          collation: null,
          data_type: 'datetime',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        },
        {
          name: 'activated_at',
          table: 'teams',
          collation: null,
          data_type: 'date',
          default_value: null,
          generation_expression: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
          comment: ''
        }
      ])
    })

    it('returns information for a specific column in a specific table', async () => {
      expect(await inspector.columnInfo('teams', 'uuid')).to.deep.equal({
        name: 'uuid',
        table: 'teams',
        data_type: 'char',
        collation: 'utf8mb4_general_ci',
        default_value: null,
        max_length: 36,
        numeric_precision: null,
        numeric_scale: null,
        is_generated: false,
        generation_expression: null,
        is_nullable: false,
        is_unique: true,
        is_primary_key: false,
        has_auto_increment: false,
        foreign_key_column: null,
        foreign_key_table: null,
        comment: '',
      })
    })
  })

  describe('.primary', () => {
    it('returns primary key for a table', async () => {
      expect(await inspector.primary('teams')).to.equal('id')
      expect(await inspector.primary('page_visits')).to.equal(null)
      expect(await inspector.primary('detailed_page_visits')).to.deep.equal([
        'domain',
        'request_path',
      ])
    })
  })

  describe('.foreignKeys', () => {
    it('returns foreign keys for all tables', async () => {
      expect(await inspector.foreignKeys()).to.deep.equal([
        {
          table: 'users',
          column: 'team_id',
          foreign_key_table: 'teams',
          foreign_key_column: 'id',
          constraint_name: 'fk_team_id',
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
        },
      ])
    })

    it('filters based on table param', async () => {
      expect(await inspector.foreignKeys('teams')).to.deep.equal([])
    })

    it('filters valid tables based on param', async () => {
      expect(await inspector.foreignKeys('users')).to.deep.equal([
        {
          table: 'users',
          column: 'team_id',
          foreign_key_table: 'teams',
          foreign_key_column: 'id',
          constraint_name: 'fk_team_id',
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
        },
      ])
    })
  })
})

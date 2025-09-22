import knex, { Knex } from 'knex';
import { expect } from 'chai';
import schemaInspector from '../lib';
import { SchemaInspector } from '../lib/types/schema-inspector';

describe('mssql', () => {
  let database: Knex;
  let inspector: SchemaInspector;

  before(() => {
    database = knex({
      client: 'mssql',
      connection: {
        host: '127.0.0.1',
        port: 1433,
        user: 'SA',
        password: 'Test@123',
        database: 'test_db',
        charset: 'utf8',
      },
    });
    inspector = schemaInspector(database);
  });

  after(async () => {
    await database.destroy();
  });

  describe('.tables', () => {
    it('returns tables', async () => {
      expect(await inspector.tables()).to.have.deep.members([
        'detailed_page_visits',
        'teams',
        'users',
        'page_visits',
      ]);
    });
  });

  describe('.tableInfo', () => {
    it('returns information for all tables', async () => {
      expect(await inspector.tableInfo()).to.have.deep.members([
        {
          name: 'teams',
          schema: 'dbo',
          catalog: 'test_db',
        },
        {
          name: 'users',
          schema: 'dbo',
          catalog: 'test_db',
        },
        {
          name: 'page_visits',
          schema: 'dbo',
          catalog: 'test_db',
        },
        {
          name: 'detailed_page_visits',
          schema: 'dbo',
          catalog: 'test_db',
        },
      ]);
    });

    it('returns information for specific table', async () => {
      expect(await inspector.tableInfo('teams')).to.deep.equal({
        name: 'teams',
        schema: 'dbo',
        catalog: 'test_db',
      });
    });
  });

  describe('.hasTable', () => {
    it('returns if table exists or not', async () => {
      expect(await inspector.hasTable('teams')).to.equal(true);
      expect(await inspector.hasTable('foobar')).to.equal(false);
    });
  });

  describe('.hasColumns', () => {
    it('returns if table and column exists or not', async () => {
      expect(await inspector.hasColumn('teams', 'credits')).to.equal(true);
      expect(await inspector.hasColumn('teams', 'foobar')).to.equal(false);
      expect(await inspector.hasColumn('foobar', 'foobar')).to.equal(false);
    });
  });

  describe('.columns', () => {
    it('returns information for all tables', async () => {
      expect(await inspector.columns()).to.have.deep.members([
        { table: 'teams', column: 'activated_at' },
        { table: 'teams', column: 'created_at' },
        { table: 'teams', column: 'credits' },
        { table: 'teams', column: 'description' },
        { table: 'teams', column: 'id' },
        { table: 'teams', column: 'name' },
        { table: 'teams', column: 'name_upper' },
        { table: 'teams', column: 'uuid' },
        { table: 'users', column: 'email' },
        { table: 'users', column: 'id' },
        { table: 'users', column: 'password' },
        { table: 'users', column: 'status' },
        { table: 'users', column: 'team_id' },
        { table: 'page_visits', column: 'created_at' },
        { table: 'page_visits', column: 'request_path' },
        { table: 'page_visits', column: 'user_agent' },
        { table: 'detailed_page_visits', column: 'domain' },
        { table: 'detailed_page_visits', column: 'request_path' },
        { table: 'detailed_page_visits', column: 'user_agent' },
      ]);
    });

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
      ]);
    });
  });

  describe('.columnInfo', () => {
    it('returns information for all columns in all tables', async () => {
      expect(await inspector.columnInfo()).to.have.deep.members([
        {
          table: 'teams',
          name: 'id',
          data_type: 'int',
          max_length: 4,
          numeric_precision: 10,
          numeric_scale: null,
          is_nullable: false,
          default_value: null,
          is_primary_key: true,
          is_unique: true,
          has_auto_increment: true,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'teams',
          name: 'uuid',
          data_type: 'char',
          max_length: 36,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_unique: true,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'teams',
          name: 'name',
          data_type: 'nvarchar',
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'teams',
          name: 'name_upper',
          data_type: 'nvarchar',
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: true,
          generation_expression: '(upper([name]))',
        },
        {
          table: 'teams',
          name: 'description',
          data_type: 'varchar',
          max_length: -1,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'teams',
          name: 'credits',
          data_type: 'int',
          max_length: 4,
          numeric_precision: 10,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'teams',
          name: 'created_at',
          data_type: 'datetime2',
          max_length: 6,
          numeric_precision: 19,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'teams',
          name: 'activated_at',
          data_type: 'date',
          max_length: 3,
          numeric_precision: 10,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'users',
          name: 'id',
          data_type: 'int',
          max_length: 4,
          numeric_precision: 10,
          numeric_scale: null,
          is_nullable: false,
          default_value: null,
          is_primary_key: true,
          is_unique: true,
          has_auto_increment: true,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'users',
          name: 'team_id',
          data_type: 'int',
          max_length: 4,
          numeric_precision: 10,
          numeric_scale: null,
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: 'teams',
          foreign_key_column: 'id',
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'users',
          name: 'email',
          data_type: 'varchar',
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'users',
          name: 'password',
          data_type: 'varchar',
          max_length: 60,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'users',
          name: 'status',
          data_type: 'varchar',
          max_length: 60,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: 'active',
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'page_visits',
          name: 'request_path',
          data_type: 'varchar',
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'page_visits',
          name: 'user_agent',
          data_type: 'varchar',
          max_length: 200,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'page_visits',
          name: 'created_at',
          data_type: 'datetime2',
          max_length: 6,
          numeric_precision: 19,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'detailed_page_visits',
          name: 'domain',
          data_type: 'varchar',
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'detailed_page_visits',
          name: 'request_path',
          data_type: 'varchar',
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: false,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
        {
          table: 'detailed_page_visits',
          name: 'user_agent',
          data_type: 'varchar',
          max_length: 200,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: true,
          default_value: null,
          is_primary_key: false,
          is_unique: false,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null,
          is_generated: false,
          generation_expression: null,
        },
      ]);
    });
    it('returns information for all columns in specific table', async () => {
      expect(await inspector.columnInfo('teams')).to.have.deep.members([
        {
          name: 'id',
          table: 'teams',
          data_type: 'int',
          default_value: null,
          max_length: 4,
          numeric_precision: 10,
          numeric_scale: null,
          is_generated: false,
          generation_expression: null,
          is_nullable: false,
          is_unique: true,
          is_primary_key: true,
          has_auto_increment: true,
          foreign_key_column: null,
          foreign_key_table: null,
        },
        {
          name: 'uuid',
          table: 'teams',
          data_type: 'char',
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
        },
        {
          name: 'name',
          table: 'teams',
          data_type: 'nvarchar',
          default_value: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          generation_expression: null,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
        },
        {
          name: 'name_upper',
          table: 'teams',
          data_type: 'nvarchar',
          default_value: null,
          max_length: 100,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: true,
          generation_expression: '(upper([name]))',
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
        },
        {
          name: 'description',
          table: 'teams',
          data_type: 'varchar',
          default_value: null,
          max_length: -1,
          numeric_precision: null,
          numeric_scale: null,
          is_generated: false,
          generation_expression: null,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
        },
        {
          name: 'credits',
          table: 'teams',
          data_type: 'int',
          default_value: null,
          max_length: 4,
          numeric_precision: 10,
          numeric_scale: null,
          is_generated: false,
          generation_expression: null,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
        },
        {
          name: 'created_at',
          table: 'teams',
          data_type: 'datetime2',
          default_value: null,
          max_length: 6,
          numeric_precision: 19,
          numeric_scale: null,
          is_generated: false,
          generation_expression: null,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
        },
        {
          name: 'activated_at',
          table: 'teams',
          data_type: 'date',
          default_value: null,
          max_length: 3,
          numeric_precision: 10,
          numeric_scale: null,
          is_generated: false,
          generation_expression: null,
          is_nullable: true,
          is_unique: false,
          is_primary_key: false,
          has_auto_increment: false,
          foreign_key_column: null,
          foreign_key_table: null,
        },
      ]);
    });
    it('returns information for a specific column in a specific table', async () => {
      expect(await inspector.columnInfo('teams', 'uuid')).to.deep.equal({
        name: 'uuid',
        table: 'teams',
        data_type: 'char',
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
      });
    });
  });

  describe('.primary', () => {
    it('returns primary key for a table', async () => {
      expect(await inspector.primary('teams')).to.equal('id');
      expect(await inspector.primary('page_visits')).to.equal(null);
      expect(await inspector.primary('detailed_page_visits')).to.deep.equal([
        'domain',
        'request_path',
      ]);
    });
  });

  describe('.foreignKeys', () => {
    it('returns foreign keys for all tables', async () => {
      expect(await inspector.foreignKeys()).to.deep.equal([
        {
          table: 'users',
          column: 'team_id',
          foreign_key_schema: 'dbo',
          foreign_key_table: 'teams',
          foreign_key_column: 'id',
          constraint_name: 'fk_team_id',
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
        },
      ]);
    });

    it('filters based on table param', async () => {
      expect(await inspector.foreignKeys('teams')).to.deep.equal([]);
    });
  });
});

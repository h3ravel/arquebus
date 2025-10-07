import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'path'
import { MigrationParser } from '../../src/type-generator/migration-parser'
import type { ColumnDefinition, TableDefinition } from '../../src/type-generator/migration-parser'

describe('MigrationParser', () => {
  let parser: MigrationParser
  let tempDir: string

  beforeEach(async () => {
    parser = new MigrationParser()
    tempDir = path.join(process.cwd(), 'test-temp', 'migrations')
    await mkdir(tempDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(path.join(process.cwd(), 'test-temp'), { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('parseMigrationFile', () => {
    it('should parse a simple create table migration', async () => {
      const migrationContent = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('users', (table) => {
      table.increments('id')
      table.string('name')
      table.string('email').unique()
      table.boolean('active').default(true)
      table.timestamps()
    })
  }

  async down(schema: SchemaBuilder) {
    await schema.dropTableIfExists('users')
  }
}
`
      const filePath = path.join(tempDir, '2024_01_01_000000_create_users_table.ts')
      await writeFile(filePath, migrationContent)

      const result = await parser.parseMigrationFile(filePath)

      expect(result.file).toBe(filePath)
      expect(result.tables).toHaveLength(1)
      
      const table = result.tables[0]
      expect(table.name).toBe('users')
      expect(table.columns).toHaveLength(6) // id, name, email, active, created_at, updated_at

      // Check specific columns
      const idColumn = table.columns.find(col => col.name === 'id')
      expect(idColumn).toEqual({
        name: 'id',
        type: 'number',
        primary: true
      })

      const nameColumn = table.columns.find(col => col.name === 'name')
      expect(nameColumn).toEqual({
        name: 'name',
        type: 'string'
      })

      const emailColumn = table.columns.find(col => col.name === 'email')
      expect(emailColumn).toMatchObject({
        name: 'email',
        type: 'string'
      })

      const activeColumn = table.columns.find(col => col.name === 'active')
      expect(activeColumn).toMatchObject({
        name: 'active',
        type: 'boolean'
      })
    })

    it('should parse table alteration migration', async () => {
      const migrationContent = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.table('users', (table) => {
      table.string('phone').nullable()
      table.integer('age')
    })
  }

  async down(schema: SchemaBuilder) {
    await schema.table('users', (table) => {
      table.dropColumn(['phone', 'age'])
    })
  }
}
`
      const filePath = path.join(tempDir, '2024_01_02_000000_add_phone_to_users.ts')
      await writeFile(filePath, migrationContent)

      const result = await parser.parseMigrationFile(filePath)

      expect(result.operations.length).toBeGreaterThanOrEqual(1)
      const alterOperation = result.operations.find(op => op.type === 'alter')
      expect(alterOperation).toBeDefined()
      expect(alterOperation).toMatchObject({
        type: 'alter',
        table: 'users',
        columns: expect.arrayContaining([
          expect.objectContaining({
            name: 'phone',
            type: 'string'
          }),
          expect.objectContaining({
            name: 'age',
            type: 'number'
          })
        ])
      })
    })

    it('should handle various column types', async () => {
      const migrationContent = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('products', (table) => {
      table.increments('id')
      table.string('name', 255)
      table.text('description')
      table.decimal('price', 8, 2)
      table.integer('quantity')
      table.boolean('in_stock')
      table.date('created_date')
      table.datetime('updated_at')
      table.json('metadata')
      table.uuid('external_id')
    })
  }

  async down(schema: SchemaBuilder) {
    await schema.dropTableIfExists('products')
  }
}
`
      const filePath = path.join(tempDir, '2024_01_03_000000_create_products_table.ts')
      await writeFile(filePath, migrationContent)

      const result = await parser.parseMigrationFile(filePath)
      const table = result.tables[0]

      expect(table.columns).toHaveLength(10)

      const columnTypes = table.columns.reduce((acc, col) => {
        acc[col.name] = col.type
        return acc
      }, {} as Record<string, string>)

      expect(columnTypes).toEqual({
        id: 'number',
        name: 'string',
        description: 'string',
        price: 'number',
        quantity: 'number',
        in_stock: 'boolean',
        created_date: 'Date',
        updated_at: 'Date',
        metadata: 'any',
        external_id: 'string'
      })
    })

    it('should parse drop table migration', async () => {
      const migrationContent = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.dropTableIfExists('old_table')
  }

  async down(schema: SchemaBuilder) {
    // Recreate table logic would go here
  }
}
`
      const filePath = path.join(tempDir, '2024_01_04_000000_drop_old_table.ts')
      await writeFile(filePath, migrationContent)

      const result = await parser.parseMigrationFile(filePath)

      expect(result.operations.length).toBeGreaterThanOrEqual(1)
      const dropOperation = result.operations.find(op => op.type === 'drop')
      expect(dropOperation).toBeDefined()
      expect(dropOperation).toEqual({
        type: 'drop',
        table: 'old_table'
      })
    })
  })

  describe('parseMigrationFiles', () => {
    it('should parse multiple migration files in order', async () => {
      // Create first migration
      const migration1 = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('users', (table) => {
      table.increments('id')
      table.string('name')
    })
  }
  async down(schema: SchemaBuilder) {
    await schema.dropTableIfExists('users')
  }
}
`
      const file1 = path.join(tempDir, '2024_01_01_000000_create_users.ts')
      await writeFile(file1, migration1)

      // Create second migration
      const migration2 = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.table('users', (table) => {
      table.string('email')
    })
  }
  async down(schema: SchemaBuilder) {
    await schema.table('users', (table) => {
      table.dropColumn('email')
    })
  }
}
`
      const file2 = path.join(tempDir, '2024_01_02_000000_add_email_to_users.ts')
      await writeFile(file2, migration2)

      const results = await parser.parseMigrationFiles([file1, file2])

      expect(results).toHaveLength(2)
      expect(results[0].tables[0].name).toBe('users')
      expect(results[1].operations[0].type).toBe('alter')
    })
  })

  describe('mapColumnType', () => {
    it('should map column types correctly', () => {
      expect(parser.mapColumnType('string')).toBe('string')
      expect(parser.mapColumnType('integer')).toBe('number')
      expect(parser.mapColumnType('boolean')).toBe('boolean')
      expect(parser.mapColumnType('date')).toBe('Date')
      expect(parser.mapColumnType('json')).toBe('any')
      expect(parser.mapColumnType('unknown')).toBe('any')
    })

    it('should handle nullable types', () => {
      expect(parser.mapColumnType('string', true)).toBe('string | null')
      expect(parser.mapColumnType('integer', true)).toBe('number | null')
      expect(parser.mapColumnType('boolean', false)).toBe('boolean')
    })
  })
})

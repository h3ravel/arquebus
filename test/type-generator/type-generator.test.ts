import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, rm, readFile } from 'node:fs/promises'
import path from 'path'
import { TypeGenerator } from '../../src/type-generator/type-generator'
import type { ParsedMigration, TableDefinition } from '../../src/type-generator/migration-parser'

describe('TypeGenerator', () => {
  let generator: TypeGenerator
  let tempDir: string

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), 'test-temp', 'types')
    await mkdir(tempDir, { recursive: true })
    
    generator = new TypeGenerator({
      outputDir: tempDir,
      includeTimestamps: true,
      generateCreateTypes: true,
      generateUpdateTypes: true
    })
  })

  afterEach(async () => {
    try {
      await rm(path.join(process.cwd(), 'test-temp'), { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('generateTypes', () => {
    it('should generate TypeScript interfaces for a simple table', async () => {
      const migrations: ParsedMigration[] = [{
        file: 'test.ts',
        tables: [{
          name: 'users',
          columns: [
            { name: 'id', type: 'number', primary: true },
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string', unique: true },
            { name: 'active', type: 'boolean', defaultValue: true },
            { name: 'created_at', type: 'Date', nullable: true },
            { name: 'updated_at', type: 'Date', nullable: true }
          ],
          indexes: [],
          foreignKeys: []
        }],
        operations: []
      }]

      const types = await generator.generateTypes(migrations)

      expect(types).toHaveLength(3) // Main, Create, Update interfaces
      
      const mainType = types.find(t => t.interfaceName === 'IUsers')
      expect(mainType).toBeDefined()
      expect(mainType!.content).toContain('export interface IUsers {')
      expect(mainType!.content).toContain('id: number')
      expect(mainType!.content).toContain('name: string')
      expect(mainType!.content).toContain('email: string')
      expect(mainType!.content).toContain('active?: boolean')
      expect(mainType!.content).toContain('created_at?: Date | null')
      expect(mainType!.content).toContain('updated_at?: Date | null')

      const createType = types.find(t => t.interfaceName === 'IUsersCreate')
      expect(createType).toBeDefined()
      expect(createType!.content).toContain('export interface IUsersCreate {')
      // Should exclude id and timestamps from create type
      expect(createType!.content).not.toContain('id?:')
      expect(createType!.content).not.toContain('created_at')
      expect(createType!.content).not.toContain('updated_at')

      const updateType = types.find(t => t.interfaceName === 'IUsersUpdate')
      expect(updateType).toBeDefined()
      expect(updateType!.content).toContain('export interface IUsersUpdate {')
      // All fields should be optional in update type
      expect(updateType!.content).toContain('name?: string')
      expect(updateType!.content).toContain('email?: string')
      expect(updateType!.content).toContain('active?: boolean')
    })

    it('should handle nullable columns correctly', async () => {
      const migrations: ParsedMigration[] = [{
        file: 'test.ts',
        tables: [{
          name: 'posts',
          columns: [
            { name: 'id', type: 'number', primary: true },
            { name: 'title', type: 'string' },
            { name: 'content', type: 'string', nullable: true },
            { name: 'published_at', type: 'Date', nullable: true }
          ],
          indexes: [],
          foreignKeys: []
        }],
        operations: []
      }]

      const types = await generator.generateTypes(migrations)
      const mainType = types.find(t => t.interfaceName === 'IPosts')
      
      expect(mainType).toBeDefined()
      expect(mainType!.content).toContain('title: string')
      expect(mainType!.content).toContain('content?: string | null')
      expect(mainType!.content).toContain('published_at?: Date | null')
    })

    it('should generate comments for column constraints', async () => {
      const migrations: ParsedMigration[] = [{
        file: 'test.ts',
        tables: [{
          name: 'products',
          columns: [
            { name: 'id', type: 'number', primary: true },
            { name: 'sku', type: 'string', unique: true, length: 50 },
            { name: 'price', type: 'number', precision: 8, scale: 2 },
            { name: 'status', type: 'string', defaultValue: 'active' }
          ],
          indexes: [],
          foreignKeys: []
        }],
        operations: []
      }]

      const types = await generator.generateTypes(migrations)
      const mainType = types.find(t => t.interfaceName === 'IProducts')
      
      expect(mainType).toBeDefined()
      expect(mainType!.content).toContain('/** Primary key */')
      expect(mainType!.content).toContain('/** Unique, Length: 50 */')
      expect(mainType!.content).toContain('/** Precision: 8, Scale: 2 */')
      expect(mainType!.content).toContain('/** Default: "active" */')
    })

    it('should build schema from multiple migrations', async () => {
      const migrations: ParsedMigration[] = [
        {
          file: '2024_01_01_create_users.ts',
          tables: [],
          operations: [{
            type: 'create',
            table: 'users',
            columns: [
              { name: 'id', type: 'number', primary: true },
              { name: 'name', type: 'string' }
            ]
          }]
        },
        {
          file: '2024_01_02_add_email_to_users.ts',
          tables: [],
          operations: [{
            type: 'alter',
            table: 'users',
            columns: [
              { name: 'email', type: 'string' }
            ]
          }]
        }
      ]

      const types = await generator.generateTypes(migrations)
      const mainType = types.find(t => t.interfaceName === 'IUsers')
      
      expect(mainType).toBeDefined()
      expect(mainType!.content).toContain('name: string')
      expect(mainType!.content).toContain('email: string')
    })
  })

  describe('writeTypesToFiles', () => {
    it('should write types to files correctly', async () => {
      const types = [
        {
          tableName: 'users',
          interfaceName: 'IUsers',
          content: 'export interface IUsers {\n  id: number\n  name: string\n}'
        },
        {
          tableName: 'users',
          interfaceName: 'IUsersCreate',
          content: 'export interface IUsersCreate {\n  name: string\n}'
        }
      ]

      await generator.writeTypesToFiles(types)

      // Check if files were created
      const userTypesPath = path.join(tempDir, 'Users.types.ts')
      const indexPath = path.join(tempDir, 'index.ts')

      const userTypesContent = await readFile(userTypesPath, 'utf-8')
      expect(userTypesContent).toContain('// Auto-generated types from migrations')
      expect(userTypesContent).toContain('export interface IUsers {')
      expect(userTypesContent).toContain('export interface IUsersCreate {')

      const indexContent = await readFile(indexPath, 'utf-8')
      expect(indexContent).toContain("export * from './Users.types'")
    })
  })

  describe('getModelName', () => {
    it('should convert table names to PascalCase', () => {
      const generator = new TypeGenerator({ outputDir: '/tmp' })
      
      expect((generator as any).getModelName('users')).toBe('Users')
      expect((generator as any).getModelName('user_profiles')).toBe('UserProfiles')
      expect((generator as any).getModelName('blog_post_comments')).toBe('BlogPostComments')
    })
  })
})

import { readdir, stat } from 'node:fs/promises'
import path from 'path'
import { MigrationParser } from './migration-parser'
import { TypeGenerator } from './type-generator'
import { ModelEnhancer } from './model-enhancer'
import type { TBaseConfig } from 'types/container'

export interface TypeGenerationOptions {
  migrationsPath: string
  outputDir: string
  typesDir?: string
  modelsDir?: string
  watch?: boolean
  includeTimestamps?: boolean
  generateGettersSetters?: boolean
  generateValidation?: boolean
  verbose?: boolean
}

export interface TypeGenerationResult {
  tablesProcessed: number
  typesGenerated: number
  modelsGenerated: number
  outputPath: string
  errors: string[]
}

/**
 * Main orchestrator for TypeScript type generation from migrations
 */
export class TypeGenerationOrchestrator {
  private parser: MigrationParser
  private typeGenerator: TypeGenerator
  private modelEnhancer: ModelEnhancer
  private options: Required<TypeGenerationOptions>

  constructor(options: TypeGenerationOptions) {
    this.options = {
      typesDir: path.join(options.outputDir, 'types'),
      modelsDir: path.join(options.outputDir, 'models'),
      watch: false,
      includeTimestamps: true,
      generateGettersSetters: true,
      generateValidation: false,
      verbose: false,
      ...options
    }

    this.parser = new MigrationParser()
    this.typeGenerator = new TypeGenerator({
      outputDir: this.options.typesDir,
      includeTimestamps: this.options.includeTimestamps,
      generateCreateTypes: true,
      generateUpdateTypes: true
    })
    this.modelEnhancer = new ModelEnhancer({
      outputDir: this.options.modelsDir,
      generateGetters: this.options.generateGettersSetters,
      generateSetters: this.options.generateGettersSetters,
      generateValidation: this.options.generateValidation
    })
  }

  /**
   * Generate types from all migration files
   */
  async generateTypes(): Promise<TypeGenerationResult> {
    const result: TypeGenerationResult = {
      tablesProcessed: 0,
      typesGenerated: 0,
      modelsGenerated: 0,
      outputPath: this.options.outputDir,
      errors: []
    }

    try {
      if (this.options.verbose) {
        console.log('🔍 Scanning migration files...')
      }

      // Find all migration files
      const migrationFiles = await this.findMigrationFiles(this.options.migrationsPath)
      
      if (migrationFiles.length === 0) {
        result.errors.push('No migration files found')
        return result
      }

      if (this.options.verbose) {
        console.log(`📁 Found ${migrationFiles.length} migration files`)
      }

      // Parse all migrations
      const migrations = await this.parser.parseMigrationFiles(migrationFiles)
      
      if (this.options.verbose) {
        console.log('🔬 Parsing migration files...')
      }

      // Build schema from migrations
      const schema = this.buildCompleteSchema(migrations)
      const tables = Object.values(schema)
      
      result.tablesProcessed = tables.length

      if (this.options.verbose) {
        console.log(`📊 Found ${tables.length} tables: ${tables.map(t => t.name).join(', ')}`)
      }

      // Generate TypeScript interfaces
      if (this.options.verbose) {
        console.log('⚡ Generating TypeScript interfaces...')
      }

      const generatedTypes = await this.typeGenerator.generateTypes(migrations)
      await this.typeGenerator.writeTypesToFiles(generatedTypes)
      
      result.typesGenerated = generatedTypes.length

      // Generate enhanced model classes
      if (this.options.generateGettersSetters) {
        if (this.options.verbose) {
          console.log('🏗️  Generating enhanced model classes...')
        }

        await this.modelEnhancer.generateModels(tables)
        result.modelsGenerated = tables.length
      }

      if (this.options.verbose) {
        console.log('✅ Type generation completed successfully!')
        console.log(`   📄 Types: ${result.typesGenerated}`)
        console.log(`   🏛️  Models: ${result.modelsGenerated}`)
        console.log(`   📂 Output: ${result.outputPath}`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      
      if (this.options.verbose) {
        console.error('❌ Type generation failed:', errorMessage)
      }
    }

    return result
  }

  /**
   * Watch migration files for changes and regenerate types
   */
  async watchMigrations(): Promise<void> {
    if (!this.options.watch) return

    const { watch } = await import('chokidar')
    
    const watcher = watch(this.options.migrationsPath, {
      ignored: /node_modules/,
      persistent: true
    })

    console.log('👀 Watching migration files for changes...')

    watcher.on('change', async (filePath) => {
      console.log(`🔄 Migration file changed: ${path.basename(filePath)}`)
      await this.generateTypes()
    })

    watcher.on('add', async (filePath) => {
      console.log(`➕ New migration file: ${path.basename(filePath)}`)
      await this.generateTypes()
    })

    watcher.on('unlink', async (filePath) => {
      console.log(`➖ Migration file deleted: ${path.basename(filePath)}`)
      await this.generateTypes()
    })
  }

  /**
   * Find all migration files in the given directory
   */
  private async findMigrationFiles(migrationsPath: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await readdir(migrationsPath)
      
      for (const entry of entries) {
        const fullPath = path.join(migrationsPath, entry)
        const stats = await stat(fullPath)
        
        if (stats.isFile() && (entry.endsWith('.ts') || entry.endsWith('.js'))) {
          // Check if it looks like a migration file (timestamp prefix)
          if (/^\d{4}_\d{2}_\d{2}_\d{6}/.test(entry)) {
            files.push(fullPath)
          }
        } else if (stats.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findMigrationFiles(fullPath)
          files.push(...subFiles)
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      return []
    }
    
    return files.sort() // Sort by filename (timestamp)
  }

  /**
   * Build complete schema by applying all migrations in order
   */
  private buildCompleteSchema(migrations: any[]) {
    const schema: Record<string, any> = {}

    // Sort migrations by filename (assuming timestamp prefix)
    const sortedMigrations = migrations.sort((a, b) => 
      path.basename(a.file).localeCompare(path.basename(b.file))
    )

    for (const migration of sortedMigrations) {
      for (const operation of migration.operations) {
        switch (operation.type) {
          case 'create':
            if (operation.columns) {
              schema[operation.table] = {
                name: operation.table,
                columns: [...operation.columns],
                indexes: [],
                foreignKeys: []
              }
            }
            break

          case 'alter':
            if (schema[operation.table] && operation.columns) {
              // Add new columns or update existing ones
              for (const newColumn of operation.columns) {
                const existingIndex = schema[operation.table].columns.findIndex(
                  (col: any) => col.name === newColumn.name
                )
                if (existingIndex >= 0) {
                  schema[operation.table].columns[existingIndex] = newColumn
                } else {
                  schema[operation.table].columns.push(newColumn)
                }
              }
            }
            break

          case 'drop':
            delete schema[operation.table]
            break
        }
      }

      // Also add tables from direct table definitions
      for (const table of migration.tables) {
        if (!schema[table.name]) {
          schema[table.name] = { ...table }
        }
      }
    }

    return schema
  }

  /**
   * Generate types for a specific config (used by CLI)
   */
  static async generateFromConfig(
    config: TBaseConfig, 
    options: Partial<TypeGenerationOptions> = {}
  ): Promise<TypeGenerationResult> {
    const migrationsPath = config.migrations?.path || 'database/migrations'
    const outputDir = options.outputDir || 'database/types'

    const orchestrator = new TypeGenerationOrchestrator({
      migrationsPath,
      outputDir,
      verbose: true,
      ...options
    })

    return await orchestrator.generateTypes()
  }
}

// Re-export all types and classes
export { MigrationParser } from './migration-parser'
export { TypeGenerator } from './type-generator'
export { ModelEnhancer } from './model-enhancer'
export type { 
  ColumnDefinition, 
  TableDefinition, 
  ParsedMigration 
} from './migration-parser'
export type { 
  GeneratedType, 
  TypeGeneratorOptions 
} from './type-generator'
export type { 
  ModelEnhancementOptions 
} from './model-enhancer'

export default TypeGenerationOrchestrator

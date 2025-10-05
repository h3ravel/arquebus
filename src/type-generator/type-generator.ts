import { writeFile, mkdir } from 'node:fs/promises'
import path from 'path'
import type { ColumnDefinition, TableDefinition, ParsedMigration } from './migration-parser'

export interface GeneratedType {
  tableName: string
  interfaceName: string
  content: string
}

export interface TypeGeneratorOptions {
  outputDir: string
  modelSuffix?: string
  interfacePrefix?: string
  includeTimestamps?: boolean
  includeOptionalFields?: boolean
  generateCreateTypes?: boolean
  generateUpdateTypes?: boolean
}

/**
 * Generates TypeScript interfaces from parsed migration data
 */
export class TypeGenerator {
  private options: Required<TypeGeneratorOptions>

  constructor(options: TypeGeneratorOptions) {
    this.options = {
      modelSuffix: 'Model',
      interfacePrefix: 'I',
      includeTimestamps: true,
      includeOptionalFields: true,
      generateCreateTypes: true,
      generateUpdateTypes: true,
      ...options
    }
  }

  /**
   * Generate TypeScript interfaces for all tables from migrations
   */
  async generateTypes(migrations: ParsedMigration[]): Promise<GeneratedType[]> {
    // Build a complete schema by processing all migrations in order
    const schema = this.buildSchemaFromMigrations(migrations)
    
    const generatedTypes: GeneratedType[] = []

    for (const [tableName, table] of Object.entries(schema)) {
      const types = await this.generateTableTypes(table)
      generatedTypes.push(...types)
    }

    return generatedTypes
  }

  /**
   * Build complete schema by applying all migrations
   */
  private buildSchemaFromMigrations(migrations: ParsedMigration[]): Record<string, TableDefinition> {
    const schema: Record<string, TableDefinition> = {}

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
                  col => col.name === newColumn.name
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
   * Generate TypeScript interfaces for a single table
   */
  private async generateTableTypes(table: TableDefinition): Promise<GeneratedType[]> {
    const types: GeneratedType[] = []
    const modelName = this.getModelName(table.name)
    const interfaceName = `${this.options.interfacePrefix}${modelName}`

    // Main model interface
    const mainInterface = this.generateMainInterface(table, interfaceName)
    types.push({
      tableName: table.name,
      interfaceName,
      content: mainInterface
    })

    // Create type (for insertions)
    if (this.options.generateCreateTypes) {
      const createInterface = this.generateCreateInterface(table, `${interfaceName}Create`)
      types.push({
        tableName: table.name,
        interfaceName: `${interfaceName}Create`,
        content: createInterface
      })
    }

    // Update type (for updates)
    if (this.options.generateUpdateTypes) {
      const updateInterface = this.generateUpdateInterface(table, `${interfaceName}Update`)
      types.push({
        tableName: table.name,
        interfaceName: `${interfaceName}Update`,
        content: updateInterface
      })
    }

    return types
  }

  /**
   * Generate main model interface
   */
  private generateMainInterface(table: TableDefinition, interfaceName: string): string {
    const columns = table.columns
    const properties: string[] = []

    for (const column of columns) {
      const property = this.generatePropertyDefinition(column, false)
      properties.push(property)
    }

    return `export interface ${interfaceName} {
${properties.map(prop => `  ${prop}`).join('\n')}
}`
  }

  /**
   * Generate create interface (for insertions)
   */
  private generateCreateInterface(table: TableDefinition, interfaceName: string): string {
    const columns = table.columns.filter(col => {
      // Exclude auto-increment primary keys and timestamps from create type
      if (col.primary && (col.type === 'number' && col.name === 'id')) return false
      if (this.options.includeTimestamps && (col.name === 'created_at' || col.name === 'updated_at')) return false
      return true
    })

    const properties: string[] = []

    for (const column of columns) {
      const property = this.generatePropertyDefinition(column, true)
      properties.push(property)
    }

    return `export interface ${interfaceName} {
${properties.map(prop => `  ${prop}`).join('\n')}
}`
  }

  /**
   * Generate update interface (for updates)
   */
  private generateUpdateInterface(table: TableDefinition, interfaceName: string): string {
    const columns = table.columns.filter(col => {
      // Exclude primary keys and created_at from update type
      if (col.primary) return false
      if (col.name === 'created_at') return false
      return true
    })

    const properties: string[] = []

    for (const column of columns) {
      // All fields are optional in update type
      const property = this.generatePropertyDefinition(column, true, true)
      properties.push(property)
    }

    return `export interface ${interfaceName} {
${properties.map(prop => `  ${prop}`).join('\n')}
}`
  }

  /**
   * Generate property definition for a column
   */
  private generatePropertyDefinition(
    column: ColumnDefinition, 
    isCreate: boolean = false,
    forceOptional: boolean = false
  ): string {
    let type = this.mapColumnTypeToTypeScript(column)
    
    // Handle nullable columns
    if (column.nullable && !type.includes('null')) {
      type = `${type} | null`
    }

    // Determine if property should be optional
    let optional = forceOptional || column.nullable || column.defaultValue !== undefined
    
    // For create types, primary keys and timestamps might be optional
    if (isCreate) {
      if (column.primary || column.name === 'created_at' || column.name === 'updated_at') {
        optional = true
      }
    }

    const optionalMarker = optional ? '?' : ''
    
    // Add JSDoc comment if there's useful information
    const comment = this.generatePropertyComment(column)
    
    return `${comment}${column.name}${optionalMarker}: ${type}`
  }

  /**
   * Generate JSDoc comment for a property
   */
  private generatePropertyComment(column: ColumnDefinition): string {
    const comments: string[] = []
    
    if (column.primary) comments.push('Primary key')
    if (column.unique) comments.push('Unique')
    if (column.index) comments.push('Indexed')
    if (column.defaultValue !== undefined) {
      comments.push(`Default: ${JSON.stringify(column.defaultValue)}`)
    }
    if (column.length) comments.push(`Length: ${column.length}`)
    if (column.precision && column.scale) {
      comments.push(`Precision: ${column.precision}, Scale: ${column.scale}`)
    }

    if (comments.length === 0) return ''

    return `/** ${comments.join(', ')} */\n  `
  }

  /**
   * Map column definition to TypeScript type
   */
  private mapColumnTypeToTypeScript(column: ColumnDefinition): string {
    // Handle enum types specially
    if (column.type === 'string' && column.name.includes('enum')) {
      // This is a simplified approach - in practice you'd want to extract enum values
      return 'string'
    }

    return column.type
  }

  /**
   * Convert table name to model name (PascalCase)
   */
  private getModelName(tableName: string): string {
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  /**
   * Write generated types to files
   */
  async writeTypesToFiles(types: GeneratedType[]): Promise<void> {
    await mkdir(this.options.outputDir, { recursive: true })

    // Group types by table
    const typesByTable = new Map<string, GeneratedType[]>()
    for (const type of types) {
      if (!typesByTable.has(type.tableName)) {
        typesByTable.set(type.tableName, [])
      }
      typesByTable.get(type.tableName)!.push(type)
    }

    // Write one file per table
    for (const [tableName, tableTypes] of typesByTable) {
      const modelName = this.getModelName(tableName)
      const fileName = `${modelName}.types.ts`
      const filePath = path.join(this.options.outputDir, fileName)

      const content = this.generateFileContent(tableTypes)
      await writeFile(filePath, content, 'utf-8')
    }

    // Generate index file
    await this.generateIndexFile(typesByTable)
  }

  /**
   * Generate content for a types file
   */
  private generateFileContent(types: GeneratedType[]): string {
    const header = `// Auto-generated types from migrations
// Do not edit this file manually

`
    const interfaces = types.map(type => type.content).join('\n\n')
    
    return header + interfaces + '\n'
  }

  /**
   * Generate index file that exports all types
   */
  private async generateIndexFile(typesByTable: Map<string, GeneratedType[]>): Promise<void> {
    const exports: string[] = []
    
    for (const [tableName] of typesByTable) {
      const modelName = this.getModelName(tableName)
      const fileName = `${modelName}.types`
      exports.push(`export * from './${fileName}'`)
    }

    const content = `// Auto-generated type exports
// Do not edit this file manually

${exports.join('\n')}
`

    const indexPath = path.join(this.options.outputDir, 'index.ts')
    await writeFile(indexPath, content, 'utf-8')
  }
}

export default TypeGenerator

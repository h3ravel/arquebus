import { readFile } from 'node:fs/promises'
import path from 'path'
import * as ts from 'typescript'

export interface ColumnDefinition {
  name: string
  type: string
  nullable?: boolean
  defaultValue?: any
  primary?: boolean
  unique?: boolean
  index?: boolean
  length?: number
  precision?: number
  scale?: number
}

export interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
  indexes: string[]
  foreignKeys: Array<{
    column: string
    references: string
    on: string
    onDelete?: string
    onUpdate?: string
  }>
}

export interface ParsedMigration {
  file: string
  tables: TableDefinition[]
  operations: Array<{
    type: 'create' | 'alter' | 'drop'
    table: string
    columns?: ColumnDefinition[]
  }>
}

/**
 * Parses migration files to extract table and column definitions
 */
export class MigrationParser {
  private typeMapping: Record<string, string> = {
    // String types
    string: 'string',
    text: 'string',
    char: 'string',
    varchar: 'string',
    longText: 'string',
    mediumText: 'string',
    tinyText: 'string',
    
    // Number types
    integer: 'number',
    int: 'number',
    bigInteger: 'number',
    bigint: 'number',
    smallInteger: 'number',
    smallint: 'number',
    tinyInteger: 'number',
    tinyint: 'number',
    increments: 'number',
    bigIncrements: 'number',
    float: 'number',
    double: 'number',
    decimal: 'number',
    
    // Boolean types
    boolean: 'boolean',
    bool: 'boolean',
    
    // Date types
    date: 'Date',
    datetime: 'Date',
    timestamp: 'Date',
    time: 'Date',
    
    // JSON types
    json: 'any',
    jsonb: 'any',
    
    // Binary types
    binary: 'Buffer',
    uuid: 'string',
    
    // Enum
    enum: 'string',
    enu: 'string'
  }

  /**
   * Parse a single migration file
   */
  async parseMigrationFile(filePath: string): Promise<ParsedMigration> {
    const content = await readFile(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(
      path.basename(filePath),
      content,
      ts.ScriptTarget.Latest,
      true
    )

    const tables: TableDefinition[] = []
    const operations: ParsedMigration['operations'] = []

    // Visit AST nodes to find schema operations
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        this.parseSchemaCall(node, tables, operations)
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    return {
      file: filePath,
      tables,
      operations
    }
  }

  /**
   * Parse multiple migration files
   */
  async parseMigrationFiles(filePaths: string[]): Promise<ParsedMigration[]> {
    const results = await Promise.all(
      filePaths.map(filePath => this.parseMigrationFile(filePath))
    )
    return results
  }

  /**
   * Parse schema method calls (createTable, table, etc.)
   */
  private parseSchemaCall(
    node: ts.CallExpression, 
    tables: TableDefinition[], 
    operations: ParsedMigration['operations']
  ): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return

    const methodName = node.expression.name.text
    const args = node.arguments

    if (methodName === 'createTable' && args.length >= 2) {
      const tableName = this.extractStringLiteral(args[0])
      if (tableName) {
        const tableDefinition: TableDefinition = {
          name: tableName,
          columns: [],
          indexes: [],
          foreignKeys: []
        }

        // Parse the table callback function
        if (ts.isArrowFunction(args[1]) || ts.isFunctionExpression(args[1])) {
          this.parseTableCallback(args[1], tableDefinition)
        }

        tables.push(tableDefinition)
        operations.push({
          type: 'create',
          table: tableName,
          columns: tableDefinition.columns
        })
      }
    } else if (methodName === 'table' && args.length >= 2) {
      const tableName = this.extractStringLiteral(args[0])
      if (tableName) {
        const columns: ColumnDefinition[] = []
        
        // Parse the table callback function for alterations
        if (ts.isArrowFunction(args[1]) || ts.isFunctionExpression(args[1])) {
          const tempTable: TableDefinition = {
            name: tableName,
            columns,
            indexes: [],
            foreignKeys: []
          }
          this.parseTableCallback(args[1], tempTable)
        }

        operations.push({
          type: 'alter',
          table: tableName,
          columns
        })
      }
    } else if (methodName === 'dropTable' || methodName === 'dropTableIfExists') {
      const tableName = this.extractStringLiteral(args[0])
      if (tableName) {
        operations.push({
          type: 'drop',
          table: tableName
        })
      }
    }
  }

  /**
   * Parse table callback function to extract column definitions
   */
  private parseTableCallback(
    callback: ts.ArrowFunction | ts.FunctionExpression,
    table: TableDefinition
  ): void {
    if (!callback.body) return

    const body = ts.isBlock(callback.body) ? callback.body : null
    if (!body) return

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        this.parseColumnCall(node, table)
      }
      ts.forEachChild(node, visit)
    }

    visit(body)
  }

  /**
   * Parse column method calls (string, integer, etc.)
   */
  private parseColumnCall(node: ts.CallExpression, table: TableDefinition): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return

    const methodName = node.expression.name.text
    const args = node.arguments

    // Check if this is a column type method
    if (this.typeMapping[methodName] && args.length >= 1) {
      const columnName = this.extractStringLiteral(args[0])
      if (columnName) {
        const column: ColumnDefinition = {
          name: columnName,
          type: this.typeMapping[methodName]
        }

        // Handle special cases
        if (methodName === 'increments' || methodName === 'bigIncrements') {
          column.primary = true
        }

        // Parse additional method calls chained to this column
        this.parseColumnModifiers(node, column)

        table.columns.push(column)
      }
    } else if (methodName === 'timestamps') {
      // Add created_at and updated_at columns
      table.columns.push(
        {
          name: 'created_at',
          type: 'Date',
          nullable: true
        },
        {
          name: 'updated_at',
          type: 'Date',
          nullable: true
        }
      )
    } else if (methodName === 'foreign') {
      // Handle foreign key constraints
      const columnName = this.extractStringLiteral(args[0])
      if (columnName) {
        // This would need more complex parsing to handle .references().on()
        // For now, we'll mark it as a foreign key column
        const existingColumn = table.columns.find(c => c.name === columnName)
        if (existingColumn) {
          // Add foreign key info to table
          table.foreignKeys.push({
            column: columnName,
            references: 'id', // Default, would need to parse .references()
            on: 'unknown' // Would need to parse .on()
          })
        }
      }
    }
  }

  /**
   * Parse column modifier methods (nullable, default, unique, etc.)
   */
  private parseColumnModifiers(node: ts.CallExpression, column: ColumnDefinition): void {
    // This is a simplified version - in practice, you'd need to traverse
    // the parent chain to find chained method calls like .nullable().default()
    
    // For now, we'll look for common patterns in the source text
    const sourceText = node.getFullText()
    
    if (sourceText.includes('.nullable()')) {
      column.nullable = true
    }
    if (sourceText.includes('.unique()')) {
      column.unique = true
    }
    if (sourceText.includes('.index()')) {
      column.index = true
    }
    if (sourceText.includes('.primary()')) {
      column.primary = true
    }
    
    // Extract default values (simplified)
    const defaultMatch = sourceText.match(/\.default\(([^)]+)\)/)
    if (defaultMatch) {
      const defaultValue = defaultMatch[1].trim()
      if (defaultValue.startsWith("'") || defaultValue.startsWith('"')) {
        column.defaultValue = defaultValue.slice(1, -1)
      } else if (defaultValue === 'true' || defaultValue === 'false') {
        column.defaultValue = defaultValue === 'true'
      } else if (!isNaN(Number(defaultValue))) {
        column.defaultValue = Number(defaultValue)
      } else {
        column.defaultValue = defaultValue
      }
    }
  }

  /**
   * Extract string literal value from AST node
   */
  private extractStringLiteral(node: ts.Node): string | null {
    if (ts.isStringLiteral(node)) {
      return node.text
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text
    }
    return null
  }

  /**
   * Map database column type to TypeScript type
   */
  mapColumnType(columnType: string, nullable: boolean = false): string {
    const baseType = this.typeMapping[columnType] || 'any'
    return nullable ? `${baseType} | null` : baseType
  }
}

export default MigrationParser

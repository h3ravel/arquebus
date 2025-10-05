import { writeFile } from 'node:fs/promises'
import path from 'path'
import type { TableDefinition, ColumnDefinition } from './migration-parser'

export interface ModelEnhancementOptions {
  outputDir: string
  baseModelPath?: string
  generateGetters?: boolean
  generateSetters?: boolean
  generateValidation?: boolean
  strictTypes?: boolean
}

/**
 * Enhances model classes with type-safe getters and setters
 */
export class ModelEnhancer {
  private options: Required<ModelEnhancementOptions>

  constructor(options: ModelEnhancementOptions) {
    this.options = {
      baseModelPath: '@h3ravel/arquebus',
      generateGetters: true,
      generateSetters: true,
      generateValidation: false,
      strictTypes: true,
      ...options
    }
  }

  /**
   * Generate enhanced model classes for all tables
   */
  async generateModels(tables: TableDefinition[]): Promise<void> {
    for (const table of tables) {
      await this.generateModelClass(table)
    }
  }

  /**
   * Generate enhanced model class for a single table
   */
  private async generateModelClass(table: TableDefinition): Promise<void> {
    const modelName = this.getModelName(table.name)
    const fileName = `${modelName}.model.ts`
    const filePath = path.join(this.options.outputDir, fileName)

    const content = this.generateModelContent(table, modelName)
    await writeFile(filePath, content, 'utf-8')
  }

  /**
   * Generate the complete model class content
   */
  private generateModelContent(table: TableDefinition, modelName: string): string {
    const imports = this.generateImports(modelName)
    const classDeclaration = this.generateClassDeclaration(table, modelName)
    const properties = this.generateProperties(table)
    const constructor = this.generateConstructor(table)
    const getters = this.options.generateGetters ? this.generateGetters(table) : ''
    const setters = this.options.generateSetters ? this.generateSetters(table) : ''
    const validation = this.options.generateValidation ? this.generateValidation(table) : ''
    const staticMethods = this.generateStaticMethods(table, modelName)

    return `${imports}

${classDeclaration} {
${properties}

${constructor}

${getters}

${setters}

${validation}

${staticMethods}
}

export default ${modelName}
`
  }

  /**
   * Generate import statements
   */
  private generateImports(modelName: string): string {
    return `import { Model } from '${this.options.baseModelPath}'
import type { 
  I${modelName}, 
  I${modelName}Create, 
  I${modelName}Update 
} from './types/${modelName}.types'`
  }

  /**
   * Generate class declaration with proper typing
   */
  private generateClassDeclaration(table: TableDefinition, modelName: string): string {
    return `export class ${modelName} extends Model implements I${modelName}`
  }

  /**
   * Generate property declarations
   */
  private generateProperties(table: TableDefinition): string {
    const properties: string[] = []
    
    // Table name
    properties.push(`  protected table = '${table.name}'`)
    
    // Primary key (if not 'id')
    const primaryKey = table.columns.find(col => col.primary)
    if (primaryKey && primaryKey.name !== 'id') {
      properties.push(`  protected primaryKey = '${primaryKey.name}'`)
    }

    // Key type
    if (primaryKey && primaryKey.type !== 'number') {
      const keyType = primaryKey.type === 'string' ? 'string' : 'int'
      properties.push(`  protected keyType = '${keyType}'`)
    }

    // Incrementing
    if (primaryKey && !primaryKey.name.includes('increment')) {
      properties.push(`  protected incrementing = false`)
    }

    // Fillable attributes
    const fillableColumns = table.columns.filter(col => 
      !col.primary && 
      col.name !== 'created_at' && 
      col.name !== 'updated_at'
    )
    
    if (fillableColumns.length > 0) {
      const fillable = fillableColumns.map(col => `'${col.name}'`).join(', ')
      properties.push(`  protected fillable = [${fillable}]`)
    }

    // Timestamps
    const hasTimestamps = table.columns.some(col => 
      col.name === 'created_at' || col.name === 'updated_at'
    )
    if (!hasTimestamps) {
      properties.push(`  public timestamps = false`)
    }

    // Casts for type conversion
    const casts = this.generateCasts(table)
    if (casts) {
      properties.push(casts)
    }

    return properties.join('\n')
  }

  /**
   * Generate casts for automatic type conversion
   */
  private generateCasts(table: TableDefinition): string {
    const casts: string[] = []

    for (const column of table.columns) {
      switch (column.type) {
        case 'boolean':
          casts.push(`    '${column.name}': 'boolean'`)
          break
        case 'Date':
          casts.push(`    '${column.name}': 'datetime'`)
          break
        case 'any': // JSON columns
          if (column.name.includes('json') || column.name.includes('data')) {
            casts.push(`    '${column.name}': 'json'`)
          }
          break
        case 'number':
          if (column.name.includes('decimal') || column.name.includes('price')) {
            casts.push(`    '${column.name}': 'decimal:2'`)
          } else {
            casts.push(`    '${column.name}': 'integer'`)
          }
          break
      }
    }

    if (casts.length === 0) return ''

    return `  protected casts = {
${casts.join(',\n')}
  }`
  }

  /**
   * Generate constructor with type safety
   */
  private generateConstructor(table: TableDefinition): string {
    return `  constructor(attributes?: Partial<I${this.getModelName(table.name)}Create>) {
    super(attributes)
  }`
  }

  /**
   * Generate type-safe getter methods
   */
  private generateGetters(table: TableDefinition): string {
    const getters: string[] = []

    for (const column of table.columns) {
      const methodName = this.getGetterName(column.name)
      const returnType = this.getTypeScriptType(column)
      
      getters.push(`  get${methodName}(): ${returnType} {
    return this.getAttribute('${column.name}')
  }`)
    }

    return getters.join('\n\n')
  }

  /**
   * Generate type-safe setter methods
   */
  private generateSetters(table: TableDefinition): string {
    const setters: string[] = []

    for (const column of table.columns) {
      // Skip auto-increment primary keys and timestamps
      if (column.primary && column.name === 'id') continue
      if (column.name === 'created_at' || column.name === 'updated_at') continue

      const methodName = this.getSetterName(column.name)
      const paramType = this.getTypeScriptType(column, true)
      
      setters.push(`  set${methodName}(value: ${paramType}): this {
    return this.setAttribute('${column.name}', value)
  }`)
    }

    return setters.join('\n\n')
  }

  /**
   * Generate validation methods
   */
  private generateValidation(table: TableDefinition): string {
    const validations: string[] = []

    // Generate validation rules based on column constraints
    const rules: string[] = []
    
    for (const column of table.columns) {
      const columnRules: string[] = []
      
      if (!column.nullable && column.name !== 'id') {
        columnRules.push("'required'")
      }
      
      if (column.type === 'string' && column.length) {
        columnRules.push(`'max:${column.length}'`)
      }
      
      if (column.type === 'string' && column.name.includes('email')) {
        columnRules.push("'email'")
      }
      
      if (column.unique) {
        columnRules.push(`'unique:${table.name},${column.name}'`)
      }

      if (columnRules.length > 0) {
        rules.push(`    '${column.name}': [${columnRules.join(', ')}]`)
      }
    }

    if (rules.length > 0) {
      validations.push(`  static get validationRules() {
    return {
${rules.join(',\n')}
    }
  }`)

      validations.push(`  validate(): boolean {
    // Implement validation logic here
    // This would integrate with your preferred validation library
    return true
  }`)
    }

    return validations.join('\n\n')
  }

  /**
   * Generate static methods for type-safe queries
   */
  private generateStaticMethods(table: TableDefinition, modelName: string): string {
    const methods: string[] = []

    // Type-safe create method
    methods.push(`  static async create(attributes: I${modelName}Create): Promise<${modelName}> {
    const instance = new this(attributes)
    await instance.save()
    return instance
  }`)

    // Type-safe update method
    methods.push(`  static async updateById(id: number | string, attributes: I${modelName}Update): Promise<${modelName}> {
    const instance = await this.findOrFail(id)
    Object.assign(instance, attributes)
    await instance.save()
    return instance
  }`)

    // Type-safe find methods with proper return types
    methods.push(`  static async findTyped(id: number | string): Promise<${modelName} | null> {
    return await this.find(id) as ${modelName} | null
  }`)

    methods.push(`  static async findOrFailTyped(id: number | string): Promise<${modelName}> {
    return await this.findOrFail(id) as ${modelName}
  }`)

    // Type-safe query builder
    methods.push(`  static queryTyped() {
    return this.query() as any // Would need more complex typing for query builder
  }`)

    return methods.join('\n\n')
  }

  /**
   * Convert column name to getter method name
   */
  private getGetterName(columnName: string): string {
    return columnName
      .split('_')
      .map((word, index) => 
        index === 0 
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('')
  }

  /**
   * Convert column name to setter method name
   */
  private getSetterName(columnName: string): string {
    return this.getGetterName(columnName)
  }

  /**
   * Get TypeScript type for column
   */
  private getTypeScriptType(column: ColumnDefinition, forSetter: boolean = false): string {
    let type = column.type
    
    if (column.nullable || forSetter) {
      type = `${type} | null`
    }
    
    return type
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
}

export default ModelEnhancer

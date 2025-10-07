# TypeScript Type Generation from Migrations

This document describes how to use Arquebus's automatic TypeScript type generation system to create type-safe model interfaces from your migration files.

## Overview

The type generation system automatically parses your migration files and generates:

1. **TypeScript Interfaces** - Type definitions for your database tables
2. **Enhanced Model Classes** - Type-safe model classes with getters/setters
3. **Create/Update Types** - Specialized types for insertions and updates

## Quick Start

### 1. Generate Types from Existing Migrations

```bash
# Generate basic TypeScript interfaces
npx arquebus generate:types

# Generate with enhanced model classes
npx arquebus generate:types --models

# Specify custom paths
npx arquebus generate:types --path ./database/migrations --output ./src/types

# Watch for changes and regenerate automatically
npx arquebus generate:types --watch --models
```

### 2. Use Generated Types in Your Code

After generation, you'll have type-safe interfaces:

```typescript
// Generated types (./database/types/User.types.ts)
export interface IUser {
  /** Primary key */
  id: number
  name: string
  /** Unique */
  email: string
  /** Default: true */
  active: boolean
  created_at: Date | null
  updated_at: Date | null
}

export interface IUserCreate {
  name: string
  email: string
  active?: boolean
}

export interface IUserUpdate {
  name?: string
  email?: string
  active?: boolean
}

// Enhanced model class (./database/types/models/User.model.ts)
export class User extends Model implements IUser {
  protected table = 'users'
  protected fillable = ['name', 'email', 'active']
  
  // Type-safe getters
  getName(): string {
    return this.getAttribute('name')
  }
  
  getEmail(): string {
    return this.getAttribute('email')
  }
  
  // Type-safe setters
  setName(value: string | null): this {
    return this.setAttribute('name', value)
  }
  
  setEmail(value: string | null): this {
    return this.setAttribute('email', value)
  }
  
  // Type-safe static methods
  static async create(attributes: IUserCreate): Promise<User> {
    const instance = new this(attributes)
    await instance.save()
    return instance
  }
}
```

## Migration Patterns

The type generator recognizes these migration patterns:

### Table Creation

```typescript
export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('users', (table) => {
      table.increments('id')           // → id: number (primary)
      table.string('name')             // → name: string
      table.string('email').unique()   // → email: string (unique)
      table.boolean('active').default(true) // → active: boolean (default: true)
      table.text('bio').nullable()     // → bio: string | null
      table.integer('age')             // → age: number
      table.decimal('salary', 8, 2)    // → salary: number
      table.date('birth_date')         // → birth_date: Date
      table.json('metadata')           // → metadata: any
      table.timestamps()               // → created_at, updated_at: Date | null
    })
  }
}
```

### Table Alterations

```typescript
export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.table('users', (table) => {
      table.string('phone').nullable()  // Adds phone: string | null
      table.integer('department_id')    // Adds department_id: number
    })
  }
}
```

### Supported Column Types

| Migration Method | TypeScript Type | Notes |
|------------------|----------------|-------|
| `increments()`, `bigIncrements()` | `number` | Auto-marked as primary key |
| `string()`, `text()`, `char()` | `string` | |
| `integer()`, `bigInteger()`, `float()`, `double()`, `decimal()` | `number` | |
| `boolean()` | `boolean` | |
| `date()`, `datetime()`, `timestamp()` | `Date` | |
| `json()`, `jsonb()` | `any` | |
| `uuid()` | `string` | |
| `binary()` | `Buffer` | |

### Column Modifiers

| Modifier | Effect on Types |
|----------|----------------|
| `.nullable()` | Adds `| null` to type |
| `.default(value)` | Adds JSDoc comment with default |
| `.unique()` | Adds JSDoc comment |
| `.index()` | Adds JSDoc comment |
| `.primary()` | Marks as primary key |

## CLI Options

### `generate:types`

Generate TypeScript types from migration files.

```bash
npx arquebus generate:types [options]
```

**Options:**

- `-p, --path [path]` - Path to migrations directory (default: from config)
- `-o, --output [path]` - Output directory for generated types (default: `./database/types`)
- `--models` - Generate enhanced model classes with type-safe getters/setters
- `--watch` - Watch migration files for changes and regenerate automatically
- `--no-timestamps` - Exclude timestamp fields from generated types
- `--validation` - Generate validation methods for models (experimental)

**Examples:**

```bash
# Basic type generation
npx arquebus generate:types

# Generate with models and watch for changes
npx arquebus generate:types --models --watch

# Custom paths
npx arquebus generate:types \
  --path ./src/database/migrations \
  --output ./src/types \
  --models

# Exclude timestamps
npx arquebus generate:types --no-timestamps
```

## Generated File Structure

```
database/types/
├── index.ts              # Exports all types
├── User.types.ts         # User table types
├── Post.types.ts         # Post table types
└── models/               # Enhanced model classes (if --models)
    ├── User.model.ts
    └── Post.model.ts
```

## Integration with Your Models

### Option 1: Use Generated Interfaces

```typescript
import { Model } from '@h3ravel/arquebus'
import type { IUser, IUserCreate, IUserUpdate } from './types'

export class User extends Model implements IUser {
  // Your existing model code with type safety
  id!: number
  name!: string
  email!: string
  active!: boolean
  created_at!: Date | null
  updated_at!: Date | null
}
```

### Option 2: Use Generated Model Classes

```typescript
// Import and use the generated model directly
import { User } from './database/types/models/User.model'

// Now you have full type safety
const user = new User({ name: 'John', email: 'john@example.com' })
user.setName('Jane')  // Type-safe setter
const name = user.getName()  // Type-safe getter

// Type-safe creation
const newUser = await User.create({
  name: 'Bob',
  email: 'bob@example.com'
  // TypeScript will error if you include 'id' or timestamps
})
```

## Workflow for Keeping Types in Sync

### 1. Development Workflow

```bash
# 1. Create a new migration
npx arquebus make:migration create_posts_table

# 2. Edit the migration file
# Add your table definition...

# 3. Run the migration
npx arquebus migrate

# 4. Generate/update types
npx arquebus generate:types --models

# 5. Use the new types in your code
```

### 2. Automated Workflow (Recommended)

Add to your `package.json`:

```json
{
  "scripts": {
    "db:migrate": "arquebus migrate && arquebus generate:types --models",
    "db:fresh": "arquebus migrate:fresh && arquebus generate:types --models",
    "dev": "arquebus generate:types --watch --models & your-dev-server"
  }
}
```

### 3. CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Run migrations and generate types
  run: |
    npm run db:migrate
    # Verify types are up to date
    git diff --exit-code database/types/
```

## Advanced Configuration

### Programmatic Usage

```typescript
import { TypeGenerationOrchestrator } from '@h3ravel/arquebus/type-generator'

const orchestrator = new TypeGenerationOrchestrator({
  migrationsPath: './database/migrations',
  outputDir: './src/types',
  includeTimestamps: true,
  generateGettersSetters: true,
  generateValidation: false,
  verbose: true
})

const result = await orchestrator.generateTypes()
console.log(`Generated types for ${result.tablesProcessed} tables`)
```

### Custom Type Mappings

You can extend the type generator to handle custom column types:

```typescript
import { MigrationParser } from '@h3ravel/arquebus/type-generator'

class CustomMigrationParser extends MigrationParser {
  constructor() {
    super()
    // Add custom type mappings
    this.typeMapping['geography'] = 'GeoJSON.Point'
    this.typeMapping['money'] = 'Decimal'
  }
}
```

## Best Practices

### 1. Keep Types in Version Control

Always commit generated type files to ensure consistency across environments.

### 2. Use Watch Mode During Development

```bash
npx arquebus generate:types --watch --models
```

This automatically regenerates types when you modify migrations.

### 3. Validate Types in CI

Add a check to ensure types are up to date:

```bash
# Generate types and check for changes
npx arquebus generate:types --models
if ! git diff --quiet database/types/; then
  echo "Types are out of sync with migrations!"
  exit 1
fi
```

### 4. Use Strict TypeScript Settings

Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Troubleshooting

### Common Issues

**Types not updating after migration changes:**
- Run `npx arquebus generate:types` manually
- Check that migration files follow the expected naming pattern
- Ensure migrations are syntactically valid TypeScript

**Generated types have incorrect nullability:**
- Check that `.nullable()` is properly called in migrations
- Verify column constraints match your expectations

**Model classes missing methods:**
- Ensure you're using `--models` flag
- Check that the output directory is correct

### Debug Mode

Enable verbose logging:

```bash
npx arquebus generate:types --models --verbose
```

This will show detailed information about the parsing and generation process.

## Limitations

1. **Complex Schema Operations**: The parser handles basic create/alter/drop operations. Complex schema manipulations may not be fully captured.

2. **Dynamic Column Names**: Columns created with dynamic names or in loops won't be parsed.

3. **Custom Column Types**: Only built-in Knex column types are supported by default.

4. **Relationship Inference**: Foreign key relationships are detected but not automatically typed as model relationships.

## Future Enhancements

- Automatic relationship type generation
- Support for custom validation rules
- Integration with schema documentation tools
- Real-time type checking in development

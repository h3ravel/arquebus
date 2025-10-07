/**
 * Example: TypeScript Type Generation from Migrations
 * 
 * This example demonstrates how to use Arquebus's automatic type generation
 * system to create type-safe model interfaces from migration files.
 */

import { TypeGenerationOrchestrator } from '../src/type-generator'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'path'

async function createExampleMigrations() {
  const migrationsDir = path.join(__dirname, 'temp', 'migrations')
  await mkdir(migrationsDir, { recursive: true })

  // Create users table migration
  const usersMigration = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('users', (table) => {
      table.increments('id')
      table.string('name')
      table.string('email').unique()
      table.boolean('active').default(true)
      table.string('role').default('user')
      table.timestamps()
    })
  }

  async down(schema: SchemaBuilder) {
    await schema.dropTableIfExists('users')
  }
}
`

  // Create posts table migration
  const postsMigration = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('posts', (table) => {
      table.increments('id')
      table.string('title')
      table.text('content')
      table.integer('user_id')
      table.boolean('published').default(false)
      table.datetime('published_at').nullable()
      table.json('metadata').nullable()
      table.timestamps()
    })
  }

  async down(schema: SchemaBuilder) {
    await schema.dropTableIfExists('posts')
  }
}
`

  // Create comments table migration
  const commentsMigration = `
import { Migration } from '@h3ravel/arquebus'
import { SchemaBuilder } from '@h3ravel/arquebus/types/query-builder'

export default class extends Migration {
  async up(schema: SchemaBuilder) {
    await schema.createTable('comments', (table) => {
      table.increments('id')
      table.text('content')
      table.integer('post_id')
      table.integer('user_id')
      table.boolean('approved').default(false)
      table.timestamps()
    })
  }

  async down(schema: SchemaBuilder) {
    await schema.dropTableIfExists('comments')
  }
}
`

  // Write migration files
  await writeFile(
    path.join(migrationsDir, '2024_01_01_000000_create_users_table.ts'),
    usersMigration
  )
  await writeFile(
    path.join(migrationsDir, '2024_01_02_000000_create_posts_table.ts'),
    postsMigration
  )
  await writeFile(
    path.join(migrationsDir, '2024_01_03_000000_create_comments_table.ts'),
    commentsMigration
  )

  return migrationsDir
}

async function runTypeGeneration() {
  console.log('🚀 Arquebus Type Generation Example')
  console.log('=====================================\n')

  try {
    // Step 1: Create example migrations
    console.log('📁 Creating example migration files...')
    const migrationsDir = await createExampleMigrations()
    console.log('✅ Migration files created\n')

    // Step 2: Set up type generation
    const outputDir = path.join(__dirname, 'temp', 'generated-types')
    
    const orchestrator = new TypeGenerationOrchestrator({
      migrationsPath: migrationsDir,
      outputDir,
      generateGettersSetters: true,
      generateValidation: false,
      verbose: true
    })

    // Step 3: Generate types
    console.log('⚡ Generating TypeScript types from migrations...')
    const result = await orchestrator.generateTypes()

    // Step 4: Display results
    console.log('\n📊 Generation Results:')
    console.log(`   Tables processed: ${result.tablesProcessed}`)
    console.log(`   Types generated: ${result.typesGenerated}`)
    console.log(`   Models generated: ${result.modelsGenerated}`)
    console.log(`   Output directory: ${result.outputPath}`)

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach(error => console.log(`   - ${error}`))
    } else {
      console.log('\n✅ Type generation completed successfully!')
    }

    // Step 5: Show example usage
    console.log('\n📝 Example Usage:')
    console.log(`
// Import generated types
import type { IUser, IUserCreate, IUserUpdate } from '${path.relative(process.cwd(), outputDir)}/types'
import { User } from '${path.relative(process.cwd(), outputDir)}/models/User.model'

// Type-safe model creation
const userData: IUserCreate = {
  name: 'John Doe',
  email: 'john@example.com',
  active: true,
  role: 'admin'
}

const user = await User.create(userData)

// Type-safe getters and setters
const userName = user.getName()        // string
user.setEmail('newemail@example.com')  // Type-safe setter

// Type-safe updates
const updateData: IUserUpdate = {
  name: 'Jane Doe',
  active: false
}

await User.updateById(user.id, updateData)
`)

    console.log('\n🎯 Next Steps:')
    console.log('1. Check the generated files in:', result.outputPath)
    console.log('2. Import and use the types in your application')
    console.log('3. Run `npx arquebus generate:types --watch` for automatic regeneration')
    console.log('4. Integrate with your CI/CD pipeline for consistent types')

  } catch (error) {
    console.error('❌ Error during type generation:', error)
    process.exit(1)
  }
}

// Run the example
if (require.main === module) {
  runTypeGeneration().catch(console.error)
}

export { runTypeGeneration }

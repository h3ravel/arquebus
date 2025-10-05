import { Argument, Option, program } from 'commander'
import { FileSystem, Logger } from '@h3ravel/shared'
import { TableGuesser, Utils } from 'src/cli/utils'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { Migrate } from 'src/migrate'
import { MigrationCreator } from 'src/migrations/migration-creator'
import { Str } from '@h3ravel/support'
import type { TBaseConfig } from 'types/container'
import type { XGeneric } from 'types/generics'
import cliPkg from '../../package.json'
import { config as dotenv } from 'dotenv'
import path from 'path'
import { snake } from 'radashi'

export class Cli {
  private cwd!: string
  private output = Logger.log()
  private config: XGeneric<TBaseConfig> = {} as TBaseConfig
  private basePath: string = ''
  private modulePath!: string
  private configPath?: string
  private modulePackage!: XGeneric<{ version: string }>

  constructor(basePath?: string) {
    this.basePath = basePath ?? (process.env.TEST === 'true' ? 'test/cli' : '')
  }

  private terminateNotFound () {
    const cmd = Logger.log([['arquebus init', ['italic', 'black', 'bgGray']]], '', false)
    this.output.error(
      `ERROR: Arquebus config not found. Run ${cmd} first.`,
    )
  }

  public static init () {
    dotenv({ quiet: true })

    const instance = new Cli()

    Promise.all([instance.loadPaths(), instance.loadConfig()]).then(([_, e]) =>
      e.run(),
    )
  }

  private async loadPaths () {
    this.cwd = path.join(process.cwd(), this.basePath)
    this.configPath = FileSystem.resolveFileUp('arquebus.config', ['js', 'ts', 'cjs'], this.cwd) ?? undefined
    this.modulePath = Utils.findModulePkg('@h3ravel/arquebus', this.cwd) ?? ''

    try {
      this.modulePackage = await import(
        path.join(this.modulePath, 'package.json')
      )
    } catch {
      this.modulePackage = { version: 'N/A' }
    }
    return this
  }

  async loadConfig () {
    try {
      this.config = (await import(this.configPath ?? '----')).default
      if (this.config.migrations?.path) {
        await mkdir(path.join(this.cwd, this.config.migrations?.path), {
          recursive: true,
        })
      }
    } catch {
      this.config = {} as TBaseConfig
    }
    return this
  }

  async run () {
    const cliVersion = [
      'Arquebus CLI version:',
      Logger.log(cliPkg.version, 'green', false),
    ].join(' ')

    const localVersion = [
      'Arquebus Local version:',
      Logger.log(this.modulePackage.version || 'None', 'green', false),
    ].join(' ')

    program.name('arquebus').version(`${cliVersion}\n${localVersion}`)

    program
      .command('init')
      .description('Create a fresh Arquebus config.')
      .addArgument(
        new Argument('[type]', 'Type of config to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js config'),
      )
      .action(async (type: 'js' | 'ts') => {
        if (!this.modulePath)
          this.output.error([
            'ERROR: No local arquebus install found',
            ' Try running: npm install arquebus --save',
          ])

        if (this.configPath) {
          this.output.error(`ERROR: ${this.configPath} already exists`)
        }

        try {
          const stubPath = `./arquebus.config.${type}`
          const code = await readFile(
            path.join(
              this.modulePath,
              `/src/stubs/arquebus.config-${type}.stub`,
            ),
            { encoding: 'utf8' },
          )
          await writeFile(path.join(this.cwd, stubPath), code)
          this.output.success(
            `Initialized: Arquebus has been initialized as ${stubPath}`,
          )
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    program
      .command('make:migration <name>')
      .description('Create a new migration file.')
      .addOption(
        new Option('-l, --type [string]', 'Type of migration file to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js migration file'),
      )
      .option('-t, --table [string]', 'The table to migrate')
      .option('-c, --create [string]', 'The table to be created')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (
        name: string,
        opts: {
          type?: 'js' | 'ts'
          table?: string
          create?: string | boolean
          path?: string
        },
      ) => {
        if (!this.configPath) this.terminateNotFound()

        try {
          name = snake(name)
          const migrationPath = path.join(
            this.cwd,
            opts.path ?? this.config.migrations?.path ?? './migrations',
          )

          let table = opts.table
          let create: boolean = Boolean(opts.create) && opts.create !== ''
          if (!table && typeof opts.create === 'string') {
            table = opts.create
            create = true
          }
          if (!table) {
            const guessed = TableGuesser.guess(name)
            table = guessed[0] as string | undefined
            create = !!guessed[1]
          }

          this.output.info('INFO: Creating Migration')
          const creator = new MigrationCreator(undefined, opts.type)
          const fileName = await creator.create(
            name,
            migrationPath,
            table,
            create,
          )
          this.output.success(
            `INFO: Migration Created \n ${Logger.log(path.basename(fileName), 'gray', false)}`,
            true,
          )
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Publish migrations from third party vendors
     */
    program
      .command('migrate:publish <package>')
      .description('Publish any migration files from packages.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (pkg: string, opts: { path?: string }) => {
        if (!this.configPath) {
          this.terminateNotFound()
        }
        try {
          const packagePath = Utils.findModulePkg(pkg) ?? ''
          const basePath = path.join(
            this.cwd,
            opts.path ?? this.config.migrations?.path ?? './migrations',
          )
          const pkgJson = await import(path.join(packagePath, 'package.json'))

          if (!packagePath) this.output.error(`ERROR: package ${pkg} not found`)

          const creator = new MigrationCreator(
            path.join(packagePath, pkgJson.migrations ?? 'migrations'),
          )
          const pkgInf = Logger.log(path.basename(pkgJson.name + '@' + pkgJson.version), ['italic', 'gray'], false)
          this.output.info(
            `INFO: Publishing migrations from ${pkgInf}`,
          )
          await creator.publish(basePath, (fileName) => {
            this.output.split('INFO: Migration Published', fileName, 'success')
          })
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Run all pending migrations
     */
    program
      .command('migrate')
      .description('Run all pending migrations.')
      .option(
        '-s, --step [number]',
        'Force the migrations to be run so they can be rolled back individually.',
      )
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts: { step?: number | string; path?: string }) => {
        if (!this.configPath) {
          this.terminateNotFound()
        }

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          const step = typeof opts.step === 'string' ? parseInt(opts.step) : opts.step
          await new Migrate(basePath).run(this.config, { ...opts, step }, true)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Rollaback the last migration
     */
    program
      .command('migrate:rollback')
      .description('Rollback the last database migration.')
      .option('-s, --step [number]', 'The number of migrations to be reverted.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts: { step?: number | string; path?: string }) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          await new Migrate(basePath, undefined, (msg, sts) => {
            if (sts) this.output[sts](msg)
          }).rollback(this.config, { ...opts, step: typeof opts.step === 'string' ? parseInt(opts.step) : opts.step }, true)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Rollback all database migrations
     */
    program
      .command('migrate:reset')
      .description('Rollback all database migrations.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts: { path?: string }) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          await new Migrate(basePath, undefined, (msg, sts) => {
            if (sts) this.output[sts](msg)
          }).reset(this.config, opts, true)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Reset and re-run all migrations
     */
    program
      .command('migrate:refresh')
      .description('Reset and re-run all migrations.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts: { path?: string }) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          await new Migrate(basePath, undefined, (msg, sts) => {
            if (sts) this.output[sts](msg)
          }).refresh(this.config, opts, true)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Drop all tables and re-run all migrations
     */
    program
      .command('migrate:fresh')
      .description('Drop all tables and re-run all migrations.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts: { path?: string }) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          await new Migrate(basePath, undefined, (msg, sts) => {
            if (sts) this.output[sts](msg)
          }).fresh(this.config, opts, true)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Check the migration status
     */
    program
      .command('migrate:status')
      .description('Show the status of each migration.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts: { path?: string }) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          const migrations = await new Migrate(
            basePath,
            undefined,
            (msg, sts) => {
              if (sts) this.output[sts](msg)
            },
          ).status(this.config, opts, true)

          if (migrations.length > 0) {
            Logger.twoColumnDetail(
              Logger.log('Migration name', 'gray', false),
              Logger.log('Batch / Status', 'gray', false),
            )

            migrations.forEach((migration) => {
              const status = migration.ran
                ? `[${migration.batch}] ${Logger.log('Ran', 'green', false)}`
                : Logger.log('Pending', 'yellow', false)
              Logger.twoColumnDetail(migration.name, status)
            })
          } else {
            console.log('No migrations found')
          }
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Run database seeders
     */
    program
      .command('db:seed')
      .description('Run database seeders.')
      .option('-p, --path [path]', 'The path to the seeders directory.')
      .action(async (opts: { path?: string }) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd
        try {
          const { arquebus } = await new Migrate(basePath).setupConnection({
            ...(this.config as any),
            skipConnection: false,
          })
          const { SeederRunner } = await import('src/seeders')
          const runner = new SeederRunner(arquebus)
          const seederPath = path.join(
            basePath,
            this.config.seeders?.path ?? './seeders',
          )
          await runner.setConnection(this.config.client).run([seederPath])
          this.output.success('Seeders executed successfully.')
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Create a new seeder file
     */
    program
      .command('make:seeder <name>')
      .description('Create a new Seeder file.')
      .addOption(
        new Option('-l, --type [string]', 'Type of seeder file to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js seeder file'),
      )
      .option('--force', 'Force creation if seeder already exists.', false)
      .option('-p, --path [path]', 'The path to the seeders directory.')
      .action(async (
        name: string,
        opts: { type?: 'js' | 'ts'; force?: boolean; path?: string },
      ) => {
        if (!this.configPath) this.terminateNotFound()
        /////
        const seederPath = path.join(
          this.cwd,
          opts.path ?? this.config.seeders?.path ?? './seeders',
          Str.of(name).snake('-') + '.' + opts.type,
        )
        try {
          if (!opts.force && await FileSystem.fileExists(seederPath)) {
            this.output.error('ERROR: Seeder already exists.')
          }

          await mkdir(path.dirname(seederPath), { recursive: true })

          const stubPath = path.join(
            this.modulePath,
            `src/stubs/seeder-${opts.type}.stub`,
          )

          let stub = await readFile(stubPath, 'utf-8')
          stub = stub.replace(/{{ name }}/g, name)
          await writeFile(seederPath, stub)

          this.output.split('INFO: Created Seeder', path.relative(this.cwd, seederPath))
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Create a new model file
     */
    program
      .command('make:model <name>')
      .description('Create a new Model file.')
      .addOption(
        new Option('-l, --type [string]', 'Type of migration file to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js migration file'),
      )
      .option('--force', 'Force creation if model already exists.', false)
      .option('-p, --path [path]', 'The path to the models directory.')
      .action(async (
        name: string,
        opts: { type?: 'js' | 'ts'; force?: boolean; path?: string },
      ) => {
        if (!this.configPath) this.terminateNotFound()

        const modelPath = path.join(
          this.cwd,
          opts.path ?? this.config.models?.path ?? './models',
          name.toLowerCase() + '.' + opts.type,
        )

        try {
          if (!opts.force && await FileSystem.fileExists(modelPath)) {
            this.output.error('ERROR: Model already exists.')
          }

          await mkdir(path.dirname(modelPath), { recursive: true })

          const stubPath = path.join(
            this.modulePath,
            `src/stubs/model-${opts.type}.stub`,
          )

          let stub = await readFile(stubPath, 'utf-8')
          stub = stub.replace(/{{ name }}/g, name)
          await writeFile(modelPath, stub)
          this.output.success(`Created Model: ${modelPath}`)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Generate TypeScript types from migrations
     */
    program
      .command('generate:types')
      .description('Generate TypeScript interfaces from migration files.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .option('-o, --output [path]', 'The output directory for generated types.')
      .option('--models', 'Generate enhanced model classes with type-safe getters/setters.')
      .option('--watch', 'Watch migration files for changes and regenerate types.')
      .option('--no-timestamps', 'Exclude timestamp fields from generated types.')
      .option('--validation', 'Generate validation methods for models.')
      .action(async (opts: { 
        path?: string
        output?: string
        models?: boolean
        watch?: boolean
        timestamps?: boolean
        validation?: boolean
      }) => {
        if (!this.configPath) this.terminateNotFound()

        try {
          const { TypeGenerationOrchestrator } = await import('../type-generator')
          
          const migrationsPath = opts.path 
            ? path.join(this.cwd, opts.path)
            : path.join(this.cwd, this.config.migrations?.path || 'database/migrations')
          
          const outputDir = opts.output 
            ? path.join(this.cwd, opts.output)
            : path.join(this.cwd, 'database/types')

          const orchestrator = new TypeGenerationOrchestrator({
            migrationsPath,
            outputDir,
            watch: opts.watch || false,
            includeTimestamps: opts.timestamps !== false,
            generateGettersSetters: opts.models || false,
            generateValidation: opts.validation || false,
            verbose: true
          })

          const result = await orchestrator.generateTypes()

          if (result.errors.length > 0) {
            for (const error of result.errors) {
              this.output.error(`ERROR: ${error}`)
            }
            process.exit(1)
          }

          this.output.success(`✅ Generated types for ${result.tablesProcessed} tables`)
          this.output.info(`📄 Types: ${result.typesGenerated}`)
          if (opts.models) {
            this.output.info(`🏛️  Models: ${result.modelsGenerated}`)
          }
          this.output.info(`📂 Output: ${result.outputPath}`)

          if (opts.watch) {
            await orchestrator.watchMigrations()
            // Keep process running for watch mode
            process.stdin.resume()
          }

        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    await program.parseAsync(process.argv)
    process.exit(0)
  }
}

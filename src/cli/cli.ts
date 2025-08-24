#!/usr/bin/env node

import { Argument, Option, program } from 'commander'
import { TableGuesser, Utils } from 'src/cli/utils'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { Migrate } from 'src/migrate'
import MigrationCreator from 'src/migrations/migration-creator'
import type { TBaseConfig } from 'types/container'
import type { XGeneric } from 'types/generics'
import chalk from 'chalk'
import cliPkg from '../../package.json'
import { config as dotenv } from 'dotenv'
import path from 'path'
import { snake } from 'radashi'

export class Cli {
  private cwd!: string
  private output = Utils.output()
  private config: XGeneric<TBaseConfig> = {} as TBaseConfig
  private basePath: string = ''
  private modulePath!: string
  private configPath?: string
  private modulePackage!: XGeneric<{ version: string }>

  constructor(basePath?: string) {
    this.basePath = basePath ?? (process.env.TEST === 'true' ? 'test/cli' : '')
  }

  private terminateNotFound () {
    this.output.error(
      `ERROR: Arquebus config not found. Run ${chalk.italic.black.bgGray('arquebus init')} first.`
    )
  }

  public static init () {
    dotenv({ quiet: true })

    const instance = new Cli()

    Promise.all([instance.loadPaths(), instance.loadConfig()])
      .then(([_, e]) => e.run())
  }

  private async loadPaths () {
    this.cwd = path.join(process.cwd(), this.basePath)
    this.configPath = Utils.findUpConfig(this.cwd, 'arquebus.config', ['js', 'ts', 'cjs']) ?? undefined
    this.modulePath = Utils.findModulePkg('@h3ravel/arquebus', this.cwd) ?? ''

    try {
      this.modulePackage = await import(path.join(this.modulePath, 'package.json'))
    } catch {
      this.modulePackage = { version: 'N/A' }
    }
    return this
  }

  async loadConfig () {
    try {
      this.config = (await import(this.configPath ?? '----')).default
      if (this.config.migrations?.path) {
        await mkdir(path.join(this.cwd, this.config.migrations?.path), { recursive: true })
      }
    } catch {
      this.config = {} as TBaseConfig
    }
    return this
  }

  async run () {
    const cliVersion = [
      'Arquebus CLI version:',
      chalk.green(cliPkg.version),
    ].join(' ')

    const localVersion = [
      'Arquebus Local version:',
      chalk.green(this.modulePackage.version || 'None'),
    ].join(' ')

    program
      .name('arquebus')
      .version(`${cliVersion}\n${localVersion}`)

    program
      .command('init')
      .description('Create a fresh Arquebus config.')
      .addArgument(
        new Argument('[type]', 'Type of config to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js config'))
      .action(async (type) => {
        if (!this.modulePath) this.output.error([
          'ERROR: No local arquebus install found',
          ' Try running: npm install arquebus --save'
        ])

        if (this.configPath) {
          this.output.error(`ERROR: ${this.configPath} already exists`)
        }

        try {
          const stubPath = `./arquebus.config.${type}`
          const code = await readFile(
            path.join(this.modulePath, `/src/stubs/arquebus.config-${type}.stub`),
            { encoding: 'utf8' }
          )
          await writeFile(path.join(this.cwd, stubPath), code)
          this.output.success(`Initialized: Arquebus has been initialized as ${stubPath}`)
        } catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    program
      .command('migrate:make <name>')
      .description('Create a new migration file.')
      .addOption(
        new Option('-l, --type [string]', 'Type of migration file to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js migration file'))
      .option('-t, --table [string]', 'The table to migrate')
      .option('-c, --create [string]', 'The table to be created')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (name, opts) => {
        if (!this.configPath) this.terminateNotFound()

        try {
          name = snake(name)
          const migrationPath = path.join(this.cwd, opts.path ?? this.config.migrations?.path ?? './migrations')

          let table = opts.table
          let create: boolean = opts.create || false
          if (!table && typeof create === 'string') {
            table = create
            create = true
          }
          if (!table) {
            const guessed = TableGuesser.guess(name)
            table = guessed[0]
            create = !!guessed[1]
          }

          this.output.info('INFO: Creating Migration')
          const creator = new MigrationCreator(undefined, opts.type)
          const fileName = await creator.create(name, migrationPath, table, create)
          this.output.success(`INFO: Migration Created \n ${chalk.gray(path.basename(fileName))}`, true)
        }
        catch (e) {
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
      .action(async (pkg, opts) => {
        if (!this.configPath) {
          this.terminateNotFound()
        }
        try {
          const packagePath = Utils.findModulePkg(pkg) ?? ''
          const basePath = path.join(this.cwd, opts.path ?? this.config.migrations?.path ?? './migrations')
          const pkgJson = (await import(path.join(packagePath, 'package.json')))

          if (!packagePath) this.output.error(`ERROR: package ${pkg} not found`)

          const creator = new MigrationCreator(path.join(packagePath, pkgJson.migrations ?? 'migrations'))

          this.output.info(`INFO: Publishing migrations from ${chalk.italic.gray(pkgJson.name + '@' + pkgJson.version)}`)
          await creator.publish(basePath, (fileName) => {
            Utils.twoColumnDetail(fileName, chalk.green('PUBLISHED'))
          })
        }
        catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Run all pending migrations
     */
    program
      .command('migrate')
      .description('Run all pending migrations.')
      .option('-s, --step [number]', 'Force the migrations to be run so they can be rolled back individually.')
      .option('-p, --path [path]', 'The path to the migrations directory.')
      .action(async (opts) => {
        if (!this.configPath) {
          this.terminateNotFound()
        }

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          await new Migrate(basePath).run(this.config, opts, true)
        }
        catch (e) {
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
      .action(async (opts) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          await new Migrate(basePath, undefined, (msg, sts) => {
            if (sts) this.output[sts](msg)
          }).rollback(this.config, opts, true)
        }
        catch (e) {
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
      .action(async (opts) => {
        if (!this.configPath) this.terminateNotFound()

        const basePath = opts.path ? path.join(this.cwd, opts.path) : this.cwd

        try {
          const migrations = await new Migrate(basePath, undefined, (msg, sts) => {
            if (sts) this.output[sts](msg)
          }).status(this.config, opts, true)

          if (migrations.length > 0) {
            Utils.twoColumnDetail(chalk.gray('Migration name'), chalk.gray('Batch / Status'))

            migrations.forEach(migration => {
              const status = migration.ran
                ? `[${migration.batch}] ${chalk.green('Ran')}`
                : chalk.yellow('Pending')
              Utils.twoColumnDetail(migration.name, status)
            })
          }
          else {
            console.log('No migrations found')
          }
        }
        catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })

    /**
     * Create a new model file
     */
    program
      .command('model:make <name>')
      .description('Create a new Model file.')
      .addOption(
        new Option('-l, --type [string]', 'Type of migration file to generate.')
          .choices(['js', 'ts'])
          .default('js', 'generates a js migration file'))
      .option('--force', 'Force creation if model already exists.', false)
      .option('-p, --path [path]', 'The path to the models directory.')
      .action(async (name, opts) => {
        if (!this.configPath) this.terminateNotFound()

        const modelPath = path.join(this.cwd, opts.path ?? this.config.models?.path ?? './models', name.toLowerCase() + '.' + opts.type)

        try {
          if (!opts.force && await Utils.fileExists(modelPath)) {
            this.output.error('ERROR: Model already exists.')
          }

          await mkdir(path.dirname(modelPath), { recursive: true })

          const stubPath = path.join(this.modulePath, `src/stubs/model-${opts.type}.stub`)

          let stub = await readFile(stubPath, 'utf-8')
          stub = stub.replace(/{{ name }}/g, name)
          await writeFile(modelPath, stub)
          this.output.success(`Created Model: ${modelPath}`)
        }
        catch (e) {
          this.output.error('ERROR: ' + e)
        }
      })
    await program.parseAsync(process.argv)
    process.exit(0)
  }
}

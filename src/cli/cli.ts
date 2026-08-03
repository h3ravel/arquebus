import { Application, Kernel, type Musket } from '@h3ravel/musket'
import { FileSystem, Logger, importFile } from '@h3ravel/shared'
import type { FileType, MakeFileOptions, MakeMigrationOptions, MigrationOptions, PathOptions } from 'types/cli'
import { TableGuesser, Utils } from './utils'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { ArquebusCommands } from './commands'
import { Migrate } from '../migrate'
import { MigrationCreator } from '../migrations/migration-creator'
import { SeederRunner } from '../seeders'
import { Str } from '@h3ravel/support'
import type { TBaseConfig } from '../../types/container'
import type { XGeneric } from '../../types/generics'
import cliPkg from '../../package.json'
import { config as dotenv } from 'dotenv'
import path from 'node:path'

export class Cli extends Application {
  private cwd!: string
  private output = Logger
  private config: XGeneric<TBaseConfig> = {} as TBaseConfig
  private basePath = ''
  private modulePath = ''
  private configPath?: string
  private modulePackage: XGeneric<{ version: string }> = { version: 'N/A' }

  constructor(basePath?: string) {
    super()
    this.basePath = basePath ?? (process.env.TEST === 'true' ? 'test/cli' : '')
  }

  public static async init() {
    dotenv({ quiet: true })

    const instance = new Cli()
    await instance.loadPaths()
    await instance.loadConfig()
    await instance.run()
  }

  registerMusketListeners(musket: Musket<this>): void {
    musket.afterHandle.once(async () => {
      process.exit(0)
    })
  }

  private terminateNotFound() {
    const cmd = Logger.log([['arquebus init', ['italic', 'black', 'bgGray']]], '', false)
    this.output.error(`ERROR: Arquebus config not found. Run ${cmd} first.`)
  }

  private ensureConfigured() {
    if (!this.configPath) this.terminateNotFound()
  }

  private resolveBasePath(requestedPath?: string) {
    return requestedPath ? path.join(this.cwd, requestedPath) : this.cwd
  }

  private async resolveStub(name: string) {
    const candidates = [
      path.join(this.modulePath, 'src/stubs', name),
      path.join(this.modulePath, 'dist/stubs', name),
    ]

    for (const candidate of candidates) {
      if (await FileSystem.fileExists(candidate)) return candidate
    }

    throw new Error(`Arquebus stub not found: ${name}`)
  }

  private migrationReporter() {
    return (message: string, status?: 'error' | 'info' | 'success' | 'quiet') => {
      if (status && status !== 'quiet') this.output[status](message)
    }
  }

  async loadPaths() {
    this.cwd = path.join(process.cwd(), this.basePath)
    this.configPath = FileSystem.resolveFileUp(
      'arquebus.config',
      ['js', 'ts', 'cjs'],
      this.cwd,
    ) ?? undefined
    this.modulePath = Utils.findModulePkg('@h3ravel/arquebus', this.cwd) ?? ''

    try {
      this.modulePackage = JSON.parse(
        await readFile(path.join(this.modulePath, 'package.json'), 'utf8'),
      )
    } catch {
      this.modulePackage = { version: 'N/A' }
    }

    return this
  }

  async loadConfig() {
    try {
      this.config = (
        await importFile<{ default: XGeneric<TBaseConfig> }>(this.configPath ?? '----')
      ).default
      if (this.config.migrations?.path) {
        await mkdir(path.join(this.cwd, this.config.migrations.path), {
          recursive: true,
        })
      }
    } catch {
      this.config = {} as TBaseConfig
    }

    return this
  }

  async run() {
    const kernel = new Kernel(this)
      .setCwd(this.cwd)
      .setConfig({
        baseCommands: ArquebusCommands as never,
        name: 'arquebus',
        hideMusketInfo: true,
        versionSeparator: '\n',
      })
      .setPackages([{
        name: '@h3ravel/arquebus',
        label: 'Arquebus CLI',
        version: cliPkg.version,
        base: true,
      },
      {
        name: '@h3ravel/arquebus',
        label: 'Arquebus ORM',
        version: this.modulePackage.version || 'N/A',
      }])
      .bootstrap()

    return await kernel.run()
  }

  async initialize(type: FileType = 'js') {
    if (!this.modulePath) {
      this.output.error([
        'ERROR: No local arquebus install found',
        ' Try running: pnpm add @h3ravel/arquebus',
      ])
    }

    if (this.configPath) {
      this.output.error(`ERROR: ${this.configPath} already exists`)
    }

    try {
      const stubPath = `./arquebus.config.${type}`
      const code = await readFile(
        await this.resolveStub(`arquebus.config-${type}.stub`),
        'utf8',
      )
      await writeFile(path.join(this.cwd, stubPath), code)
      this.output.success(`Initialized: Arquebus has been initialized as ${stubPath}`)
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async makeMigration(rawName: string, options: MakeMigrationOptions) {
    this.ensureConfigured()

    try {
      const name = Str.snake(rawName)
      const migrationPath = path.join(
        this.cwd,
        options.path ?? this.config.migrations?.path ?? './migrations',
      )

      let table = options.table
      let create = Boolean(options.create) && options.create !== ''
      if (!table && typeof options.create === 'string') {
        table = options.create
        create = true
      }
      if (!table) {
        const guessed = TableGuesser.guess(name)
        table = guessed[0] as string | undefined
        create = Boolean(guessed[1])
      }

      this.output.info('INFO: Creating Migration')
      const creator = new MigrationCreator(undefined, options.type ?? 'js')
      const fileName = await creator.create(name, migrationPath, table, create)
      this.output.success(
        `INFO: Migration Created \n ${Logger.log(path.basename(fileName), 'gray', false)}`,
        true,
      )
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async publishMigrations(pkg: string, options: PathOptions) {
    this.ensureConfigured()

    try {
      const packagePath = Utils.findModulePkg(pkg) ?? ''
      if (!packagePath) this.output.error(`ERROR: package ${pkg} not found`)

      const basePath = path.join(
        this.cwd,
        options.path ?? this.config.migrations?.path ?? './migrations',
      )
      const pkgJson = JSON.parse(
        await readFile(path.join(packagePath, 'package.json'), 'utf8'),
      )
      const creator = new MigrationCreator(
        path.join(packagePath, pkgJson.migrations ?? 'migrations'),
      )
      const pkgInfo = Logger.log(
        path.basename(pkgJson.name + '@' + pkgJson.version),
        ['italic', 'gray'],
        false,
      )
      this.output.info(`INFO: Publishing migrations from ${pkgInfo}`)
      await creator.publish(basePath, (fileName) => {
        this.output.split('INFO: Migration Published', fileName, 'success')
      })
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async migrate(options: MigrationOptions) {
    this.ensureConfigured()
    const basePath = this.resolveBasePath(options.path)

    try {
      const step = typeof options.step === 'string'
        ? Number.parseInt(options.step)
        : options.step
      await new Migrate(basePath).run(this.config, { ...options, step }, true)
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async rollback(options: MigrationOptions) {
    this.ensureConfigured()
    const basePath = this.resolveBasePath(options.path)

    try {
      const step = typeof options.step === 'string'
        ? Number.parseInt(options.step)
        : options.step
      await new Migrate(basePath, undefined, this.migrationReporter())
        .rollback(this.config, { ...options, step }, true)
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async reset(options: PathOptions) {
    await this.runMigrationOperation('reset', options)
  }

  async refresh(options: PathOptions) {
    await this.runMigrationOperation('refresh', options)
  }

  async fresh(options: PathOptions) {
    await this.runMigrationOperation('fresh', options)
  }

  private async runMigrationOperation(
    operation: 'reset' | 'refresh' | 'fresh',
    options: PathOptions,
  ) {
    this.ensureConfigured()
    const basePath = this.resolveBasePath(options.path)

    try {
      const migrate = new Migrate(basePath, undefined, this.migrationReporter())
      await migrate[operation](this.config, options, true)
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async status(options: PathOptions) {
    this.ensureConfigured()
    const basePath = this.resolveBasePath(options.path)

    try {
      const migrations = await new Migrate(
        basePath,
        undefined,
        this.migrationReporter(),
      ).status(this.config, options, true)

      if (migrations.length === 0) {
        this.output.info('No migrations found')
        return
      }

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
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async seed(options: PathOptions) {
    this.ensureConfigured()
    const basePath = this.resolveBasePath(options.path)

    try {
      const { arquebus } = await new Migrate(basePath).setupConnection({
        ...this.config,
        skipConnection: false,
      })
      const seederPath = path.join(
        basePath,
        this.config.seeders?.path ?? './seeders',
      )
      await new SeederRunner(arquebus)
        .setConnection(this.config.client)
        .run([seederPath])
      this.output.success('Seeders executed successfully.')
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async makeSeeder(name: string, options: MakeFileOptions) {
    this.ensureConfigured()
    const type = options.type ?? 'js'
    const seederPath = path.join(
      this.cwd,
      options.path ?? this.config.seeders?.path ?? './seeders',
      `${Str.of(name).snake('-')}.${type}`,
    )

    try {
      if (!options.force && await FileSystem.fileExists(seederPath)) {
        this.output.error('ERROR: Seeder already exists.')
      }

      await mkdir(path.dirname(seederPath), { recursive: true })
      const stubPath = await this.resolveStub(`seeder-${type}.stub`)
      const stub = (await readFile(stubPath, 'utf8')).replace(/{{ name }}/g, name)
      await writeFile(seederPath, stub)
      this.output.split('INFO: Created Seeder', path.relative(this.cwd, seederPath))
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }

  async makeModel(name: string, options: MakeFileOptions) {
    this.ensureConfigured()
    const type = options.type ?? 'js'
    const modelPath = path.join(
      this.cwd,
      options.path ?? this.config.models?.path ?? './models',
      `${name.toLowerCase()}.${type}`,
    )

    try {
      if (!options.force && await FileSystem.fileExists(modelPath)) {
        this.output.error('ERROR: Model already exists.')
      }

      await mkdir(path.dirname(modelPath), { recursive: true })
      const stubPath = await this.resolveStub(`model-${type}.stub`)
      const stub = (await readFile(stubPath, 'utf8')).replace(/{{ name }}/g, name)
      await writeFile(modelPath, stub)
      this.output.success(`Created Model: ${modelPath}`)
    } catch (error) {
      this.output.error('ERROR: ' + error)
    }
  }
}

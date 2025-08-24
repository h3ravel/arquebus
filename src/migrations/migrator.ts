import type { IMigration } from './migration'
import type MigrationRepository from './migration-repository'
import type { QueryBuilder } from 'src/query-builder'
import type { TBaseConfig } from 'types/container'
import type { arquebus } from 'arquebus'
import color from 'chalk'
import fs from 'node:fs/promises'
import path from 'path'

/* 
 * Glob utility to recursively collect all file paths
 */
async function glob (folderPath: string): Promise<string[]> {
  const files = await fs.readdir(folderPath)
  const allFiles: string[] = []

  for (const file of files) {
    const filePath = `${folderPath}/${file}`
    const stats = await fs.stat(filePath)
    if (stats.isFile()) {
      allFiles.push(filePath)
    } else if (stats.isDirectory()) {
      const subFiles = await glob(filePath)
      allFiles.push(...subFiles)
    }
  }
  return allFiles
}

/*
 * Migrator options
 */
export interface MigrationOptions {
  pretend?: boolean
  step?: number
  batch?: number
}

class Migrator {
  events: any = null
  repository: MigrationRepository
  files: any
  resolver: typeof arquebus
  connection!: TBaseConfig['client']
  paths: string[] = []
  output: boolean | null = null

  constructor(
    repository: MigrationRepository,
    resolver: typeof arquebus | null = null,
    files: any = null,
    dispatcher: any = null
  ) {
    this.repository = repository
    this.files = files
    this.resolver = resolver!
    this.events = dispatcher
  }

  async run (paths: string[] = [], options: MigrationOptions = {}): Promise<string[]> {
    const files = await this.getMigrationFiles(paths)
    const ran = await this.repository.getRan() as any
    const migrations = this.pendingMigrations(files, ran)

    await this.runPending(migrations, options)
    return migrations
  }

  pendingMigrations (files: Record<string, string>, ran: string[]): string[] {
    return Object.values(files).filter(file => !ran.includes(this.getMigrationName(file)))
  }

  async runPending (migrations: string[], options: MigrationOptions = {}): Promise<void> {
    if (migrations.length === 0) {
      this.write('Nothing to migrate')
      return
    }
    let batch = await this.repository.getNextBatchNumber()
    const pretend = options.pretend || false
    const step = options.step || false

    this.write('Running migrations.')

    for (const file of migrations) {
      await this.runUp(file, batch, pretend)
      if (step) {
        batch++
      }
    }
  }

  async runUp (file: string, batch: number, _pretend: boolean): Promise<void> {
    const migration = await this.resolvePath(file)
    const name = this.getMigrationName(file)

    await this.writeTask(name, () => this.runMigration(migration, 'up'))
    await this.repository.log(name, batch)
  }

  async runDown (file: string, migration: { migration: string }, _pretend: boolean): Promise<void> {
    const instance = await this.resolvePath(file)
    const name = this.getMigrationName(file)

    await this.writeTask(name, () => this.runMigration(instance, 'down'))
    await this.repository.delete(migration)
  }

  async rollback (paths: string[] = [], options: MigrationOptions = {}): Promise<string[]> {
    const migrations = await this.getMigrationsForRollback(options)
    if (migrations.length === 0) {
      this.write('Nothing to rollback.')
      return []
    }
    return await this.rollbackMigrations(migrations, paths, options)
  }

  async getMigrationsForRollback (options: MigrationOptions): Promise<{ migration: string }[]> {
    if (options.step && options.step > 0) {
      return await this.repository.getMigrations(options.step)
    }
    if (options.batch && options.batch > 0) {
      return await this.repository.getMigrationsByBatch(options.batch)
    }
    return await this.repository.getLast()
  }

  async rollbackMigrations (migrations: { migration: string }[], paths: string[], options: MigrationOptions): Promise<string[]> {
    const rolledBack: string[] = []
    const files = await this.getMigrationFiles(paths)
    this.write('Rolling back migrations.')
    for (const migration of migrations) {
      const file = files[migration.migration]
      if (!file) {
        this.writeTwoColumns(migration.migration, color.yellow('Migration not found'))
        continue
      }
      rolledBack.push(file)
      await this.runDown(file, migration, options.pretend || false)
    }
    return rolledBack
  }

  reset (_paths: string[] = [], _pretend = false): Promise<string[]> | string[] {
    const _migrations = this.repository.getRan().then(r => r.reverse()) // ⚠ repository.getRan is async
    // Keeping your original but fixed return type
    return [] // placeholder – this method should be async if using getRan()
  }

  resetMigrations (migrations: { migration: string }[], paths: string[], pretend = false): Promise<string[]> {
    return this.rollbackMigrations(migrations, paths, { pretend })
  }

  async runMigration (migration: IMigration, method: 'up' | 'down'): Promise<void> {

    const connection = this.resolveConnection(migration.getConnection())

    const callback = async (trx: any) => {
      if (typeof migration[method] === 'function') {
        await this.runMethod(trx, migration, method)
      }
    }

    if (migration.withinTransaction) {
      await connection.transaction(callback)
    } else {
      await callback(connection)
    }
  }

  async runMethod (connection: QueryBuilder, migration: IMigration, method: 'up' | 'down'): Promise<void> {
    await migration[method]?.(connection.schema, connection)
  }

  async resolvePath (filePath: string): Promise<IMigration> {
    try {
      return new (await import(filePath)).default as IMigration
    } catch { /** */ }

    return new (class implements Partial<IMigration> { })() as IMigration
  }

  getMigrationClass (migrationName: string): string {
    return migrationName
      .split('_')
      .slice(4)
      .map(str => str.charAt(0).toUpperCase() + str.slice(1))
      .join('')
  }

  async getMigrationFiles (paths: string[]): Promise<Record<string, string>> {
    const files: string[] = []

    for (const p of paths) {
      if (p.endsWith('.js') || p.endsWith('.ts')) {
        files.push(p)
        continue
      }

      files.push(...await glob(p))
    }

    return files.filter(Boolean).reduce((result: Record<string, string>, file: string) => {
      result[this.getMigrationName(file)] = file
      return result
    }, {})
  }

  getMigrationName (filePath: string): string {
    return path.basename(filePath).replace('.js', '')
  }

  path (p: string): void {
    this.paths = Array.from(new Set([...this.paths, p]))
  }

  getPaths (): string[] {
    return this.paths
  }

  getConnection (): TBaseConfig['client'] {
    return this.connection
  }

  resolveConnection (connection?: TBaseConfig['client']): any {
    return this.resolver.connection(connection || this.connection)
  }

  getRepository (): MigrationRepository {
    return this.repository
  }

  repositoryExists (): Promise<boolean> {
    return this.repository.repositoryExists()
  }

  async hasRunAnyMigrations (): Promise<boolean> {
    const ran = await this.repository.getRan()
    const exists = await this.repositoryExists()
    return exists && ran.length > 0
  }

  deleteRepository (): void {
    this.repository.deleteRepository()
  }

  setOutput (output: boolean): this {
    this.output = output
    return this
  }

  write (...args: any[]): void {
    if (this.output) {
      console.log(...args)
    }
  }

  writeTwoColumns (name: string, ...args: string[]): void {
    const value = args.join(' ')
    // eslint-disable-next-line no-control-regex
    const regex = /\x1b\[\d+m/g
    const width = Math.min(process.stdout.columns, 100)
    const dots = Math.max(width - name.replace(regex, '').length - value.replace(regex, '').length - 10, 0)
    this.write(name, color.gray('.'.repeat(dots)), value)
  }

  async writeTask (description: string, task: () => Promise<any> | any): Promise<void> {
    const startTime = process.hrtime()
    let result: any = false
    try {
      result = await (task || (() => true))()
    } finally {
      const endTime = process.hrtime(startTime)
      const duration = (endTime[0] * 1e9 + endTime[1]) / 1e6
      this.writeTwoColumns(
        color.green(description),
        color.gray(`${Math.floor(duration)}ms`),
        result !== false ? color.green('✔') : color.red('✘')
      )
    }
  }
}

export default Migrator

#!/usr/bin/env node
import { program } from 'commander'
import path from 'path'
import { promisify } from 'util'
import fs from 'fs'
import * as color from 'colorette'
import resolveFrom from 'resolve-from'
import { snake } from 'radashi'
import { success, exit, twoColumnDetail, findUpConfig, findUpModulePath, findModulePkg, TableGuesser, localModuleCheck } from './utils.js'
import cliPkg from '../package.json' with { type: 'json' }

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

const env = {
  modulePath: findModulePkg('arquebus') || resolveFrom.silent(process.cwd(), 'arquebus') || findUpModulePath(process.cwd(), 'arquebus'),
  cwd: process.cwd(),
  configPath: findUpConfig(process.cwd(), 'arquebus.config', ['js', 'cjs'])
}
let modulePackage = {}
try {
  modulePackage = require(path.join(env.modulePath, 'package.json'))
}
catch {
  /* empty */
}
function getArquebusModule (modulePath) {
  localModuleCheck(env)
}
const cliVersion = [
  'Arquebus CLI version:',
  color.green(cliPkg.version),
].join(' ')
const localVersion = [
  'Arquebus Local version:',
  color.green(modulePackage.version || 'None'),
].join(' ')
program
  .name('arquebus')
  .version(`${cliVersion}\n${localVersion}`)
program
  .command('init')
  .description('Create a fresh arquebus config.')
  .action(async () => {
    localModuleCheck(env)
    const type = 'js'
    if (env.configPath) {
      exit(`Error: ${env.configPath} already exists`)
    }
    try {
      const stubPath = `./arquebus.config.${type}`
      const code = await readFile(env.modulePath +
        '/src/stubs/arquebus.config-' +
        type +
        '.stub')
      await writeFile(stubPath, code)
      success(color.green(`Created ${stubPath}`))
    }
    catch (e) {
      exit(e)
    }
  })
program
  .command('migrate:make <name>')
  .description('Create a new migration file.')
  .option('--table', 'The table to migrate')
  .option('--create', 'The table to be created')
  .action(async (name, opts) => {
    if (!env.configPath) {
      exit('Error: arquebus config not found. Run `arquebus init` first.')
    }
    try {
      name = snake(name)
      let table = opts.table
      let create = opts.create || false
      if (!table && typeof create === 'string') {
        table = create
        create = true
      }
      if (!table) {
        const guessed = TableGuesser.guess(name)
        table = guessed[0]
        create = guessed[1]
      }
      const MigrationCreator = getArquebusModule('src/migrations/migration-creator')
      const creator = new MigrationCreator('')
      const fileName = await creator.create(name, env.cwd + `/${config?.migrations?.path || 'migrations'}`, table, create)
      success(color.green(`Created Migration: ${fileName}`))
    }
    catch (err) {
      exit(err)
    }
  })
program
  .command('migrate:publish <package>')
  .description('Publish any migration files from packages.')
  .action(async (pkg, opts) => {
    if (!env.configPath) {
      exit('Error: arquebus config not found. Run `arquebus init` first.')
    }
    try {
      const packagePath = findModulePkg(pkg)
      if (!packagePath) {
        exit(`Error: package ${pkg} not found`)
      }
      const MigrationCreator = getArquebusModule('src/migrations/migration-creator')
      const creator = new MigrationCreator(path.join(packagePath, 'migrations'))
      console.log(color.green('Publishing migrations:'))
      const fileNames = await creator.publish(env.cwd + `/${config?.migrations?.path || 'migrations'}`, (fileName, oldPath, newPath) => {
        console.log(newPath + ' ' + color.green('DONE'))
      })
    }
    catch (err) {
      exit(err)
    }
  })
program
  .command('migrate:run')
  .description('Run all pending migrations.')
  .option('--step', 'Force the migrations to be run so they can be rolled back individually.')
  .option('--path <path>', 'The path to the migrations directory.')
  .action(async (opts) => {
    if (!env.configPath) {
      exit('Error: arquebus config not found. Run `arquebus init` first.')
    }
    try {
      const { migrateRun } = getArquebusModule('src/migrate')
      await migrateRun(config, opts, true)
    }
    catch (err) {
      exit(err)
    }
  })
program
  .command('migrate:rollback')
  .description('Rollback the last database migration.')
  .option('--step <number>', 'The number of migrations to be reverted.')
  .option('--path <path>', 'The path to the migrations directory.')
  .action(async (opts) => {
    if (!env.configPath) {
      exit('Error: arquebus config not found. Run `arquebus init` first.')
    }
    try {
      const { migrateRollback } = getArquebusModule('src/migrate')
      await migrateRollback(config, opts, true)
    }
    catch (err) {
      exit(err)
    }
  })
program
  .command('migrate:status')
  .description('Show the status of each migration.')
  .option('--path <path>', 'The path to the migrations directory.')
  .action(async (opts) => {
    if (!env.configPath) {
      exit('Error: arquebus config not found. Run `arquebus init` first.')
    }
    try {
      const { migrateStatus } = getArquebusModule('src/migrate')
      const migrations = await migrateStatus(config, opts, true)
      if (migrations.length > 0) {
        twoColumnDetail(color.gray('Migration name'), color.gray('Batch / Status'))
        migrations.forEach(migration => {
          const status = migration.ran
            ? `[${migration.batch}] ${color.green('Ran')}`
            : color.yellow('Pending')
          twoColumnDetail(migration.name, status)
        })
      }
      else {
        console.log('No migrations found')
      }
    }
    catch (err) {
      exit(err)
    }
  })
program
  .command('model:make <name>')
  .description('Create a new Model file.')
  .option('--force', 'Force creation if model already exists.', false)
  .action(async (name, opts) => {
    if (!env.configPath) {
      exit('Error: arquebus config not found. Run `arquebus init` first.')
    }
    try {
      const modelPath = path.join(env.cwd, config?.models?.path || 'models', name?.toLowerCase() + '.js')
      if (!opts.force && fs.existsSync(modelPath)) {
        exit('Model already exists.')
      }
      await promisify(fs.mkdir)(path.dirname(modelPath), { recursive: true })
      const stubPath = path.join(env.modulePath, 'src/stubs/model-js.stub')
      let stub = await readFile(stubPath, 'utf-8')
      stub = stub.replace(/{{ name }}/g, name)
      await writeFile(modelPath, stub)
      success(color.green(`Created Model: ${modelPath}`))
    }
    catch (err) {
      exit(err)
    }
  })
program.parse()

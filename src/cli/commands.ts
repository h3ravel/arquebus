import { Command, type SignatureBuilder } from '@h3ravel/musket'

import type {
  Cli,
  FileType,
  MakeFileOptions,
  MakeMigrationOptions,
  MigrationOptions,
  PathOptions,
} from './cli'

abstract class ArquebusCommand extends Command<Cli> {
  protected pathOption (signature: SignatureBuilder) {
    return signature.option('path', {
      short: 'p',
      optionalValue: true,
      description: 'The path used by the command.',
    })
  }
}

export class InitCommand extends ArquebusCommand {
  protected buildSignature (signature: SignatureBuilder) {
    return signature
      .command('init')
      .describe('Create a fresh Arquebus config.')
      .argument('type', {
        required: false,
        default: 'js',
        choices: ['js', 'ts'],
        description: 'Type of config to generate.',
      })
  }

  async handle () {
    await this.app.initialize(this.argument('type', 'js') as FileType)
  }
}

export class MakeMigrationCommand extends ArquebusCommand {
  protected buildSignature (signature: SignatureBuilder) {
    return this.pathOption(signature
      .command('make:migration')
      .describe('Create a new migration file.')
      .argument('name', { description: 'The migration name.' })
      .option('type', {
        short: 'l',
        default: 'js',
        choices: ['js', 'ts'],
        description: 'Type of migration file to generate.',
      })
      .option('table', {
        short: 't',
        optionalValue: true,
        description: 'The table to migrate.',
      })
      .option('create', {
        short: 'c',
        optionalValue: true,
        description: 'The table to create.',
      }))
  }

  async handle () {
    await this.app.makeMigration(
      this.argument('name'),
      this.options() as MakeMigrationOptions,
    )
  }
}

export class PublishMigrationsCommand extends ArquebusCommand {
  protected buildSignature (signature: SignatureBuilder) {
    return this.pathOption(signature
      .command('migrate:publish')
      .describe('Publish migration files from a package.')
      .argument('package', { description: 'The package to publish from.' }))
  }

  async handle () {
    await this.app.publishMigrations(
      this.argument('package'),
      this.options() as PathOptions,
    )
  }
}

abstract class MigrationPathCommand extends ArquebusCommand {
  protected abstract commandName: string
  protected abstract commandDescription: string
  protected abstract execute(options: PathOptions): Promise<void>

  protected buildSignature (signature: SignatureBuilder) {
    return this.pathOption(signature
      .command(this.commandName)
      .describe(this.commandDescription))
  }

  async handle () {
    await this.execute(this.options() as PathOptions)
  }
}

export class MigrateCommand extends ArquebusCommand {
  protected buildSignature (signature: SignatureBuilder) {
    return this.pathOption(signature
      .command('migrate')
      .describe('Run all pending migrations.')
      .option('step', {
        short: 's',
        optionalValue: true,
        description: 'Run migrations in individual batches.',
      }))
  }

  async handle () {
    await this.app.migrate(this.options() as MigrationOptions)
  }
}

export class RollbackCommand extends ArquebusCommand {
  protected buildSignature (signature: SignatureBuilder) {
    return this.pathOption(signature
      .command('migrate:rollback')
      .describe('Rollback the last database migration.')
      .option('step', {
        short: 's',
        optionalValue: true,
        description: 'The number of migrations to revert.',
      }))
  }

  async handle () {
    await this.app.rollback(this.options() as MigrationOptions)
  }
}

export class ResetCommand extends MigrationPathCommand {
  protected commandName = 'migrate:reset'
  protected commandDescription = 'Rollback all database migrations.'
  protected execute (options: PathOptions) { return this.app.reset(options) }
}

export class RefreshCommand extends MigrationPathCommand {
  protected commandName = 'migrate:refresh'
  protected commandDescription = 'Reset and re-run all migrations.'
  protected execute (options: PathOptions) { return this.app.refresh(options) }
}

export class FreshCommand extends MigrationPathCommand {
  protected commandName = 'migrate:fresh'
  protected commandDescription = 'Drop all tables and re-run all migrations.'
  protected execute (options: PathOptions) { return this.app.fresh(options) }
}

export class MigrationStatusCommand extends MigrationPathCommand {
  protected commandName = 'migrate:status'
  protected commandDescription = 'Show the status of each migration.'
  protected execute (options: PathOptions) { return this.app.status(options) }
}

export class SeedCommand extends MigrationPathCommand {
  protected commandName = 'db:seed'
  protected commandDescription = 'Run database seeders.'
  protected execute (options: PathOptions) { return this.app.seed(options) }
}

abstract class MakeFileCommand extends ArquebusCommand {
  protected abstract commandName: string
  protected abstract commandDescription: string
  protected abstract fileDescription: string
  protected abstract execute(name: string, options: MakeFileOptions): Promise<void>

  protected buildSignature (signature: SignatureBuilder) {
    return this.pathOption(signature
      .command(this.commandName)
      .describe(this.commandDescription)
      .argument('name', { description: `The ${this.fileDescription} name.` })
      .option('type', {
        short: 'l',
        default: 'js',
        choices: ['js', 'ts'],
        description: `Type of ${this.fileDescription} file to generate.`,
      })
      .option('force', {
        description: `Overwrite an existing ${this.fileDescription} file.`,
      }))
  }

  async handle () {
    await this.execute(this.argument('name'), this.options() as MakeFileOptions)
  }
}

export class MakeSeederCommand extends MakeFileCommand {
  protected commandName = 'make:seeder'
  protected commandDescription = 'Create a new seeder file.'
  protected fileDescription = 'seeder'
  protected execute (name: string, options: MakeFileOptions) {
    return this.app.makeSeeder(name, options)
  }
}

export class MakeModelCommand extends MakeFileCommand {
  protected commandName = 'make:model'
  protected commandDescription = 'Create a new model file.'
  protected fileDescription = 'model'
  protected execute (name: string, options: MakeFileOptions) {
    return this.app.makeModel(name, options)
  }
}

export const ArquebusCommands = [
  InitCommand,
  MakeMigrationCommand,
  PublishMigrationsCommand,
  MigrateCommand,
  RollbackCommand,
  ResetCommand,
  RefreshCommand,
  FreshCommand,
  MigrationStatusCommand,
  SeedCommand,
  MakeSeederCommand,
  MakeModelCommand,
]

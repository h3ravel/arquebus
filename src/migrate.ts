import MigrationRepository from './migrations/migration-repository'
import Migrator from './migrations/migrator'
import type { TBaseConfig } from 'types/container'
import { Utils } from 'src/cli/utils'
import arquebus from './arquebus'

interface MigrationStatus {
    name: string
    ran: boolean
    batch: number | null
}

interface MigrateOptions {
    path?: string
    step?: number
    pretend?: boolean
    batch?: number
}

interface TXBaseConfig extends TBaseConfig {
    /**
     * Set this to true if you alread have an active connection and dont wan to create a new one
     */
    skipConnection?: boolean
}

interface TCallback {
    (message: string, status?: 'success' | 'error' | 'info' | 'quiet'): void
}

export class Migrate {
    private callback: TCallback

    constructor(
        private basePath?: string,
        private customStubPath?: string,
        callback?: TCallback
    ) {
        this.callback = callback ?? ((_ = '') => { })
    }

    /**
     * Runs all pending migrations
     * 
     * @param config 
     * @param options 
     * @param destroyAll 
     */
    async run (
        config: TXBaseConfig,
        options: MigrateOptions = {},
        destroyAll = false
    ): Promise<void> {
        const { arquebus, migrator } = await this.setupConnection(config)

        await this.prepareDatabase(migrator)

        const paths = await Utils.getMigrationPaths(
            this.basePath ?? process.cwd(),
            migrator,
            config.migrations!.path,
            options.path!
        )

        await migrator.setOutput(true).run(paths, {
            step: options.step,
            pretend: options.pretend,
        })

        if (destroyAll) {
            await arquebus.destroyAll()
        }
    }

    /**
     * Rollback the last migration
     * 
     * @param config 
     * @param options 
     * @param destroyAll 
     */
    async rollback (
        config: TXBaseConfig,
        options: MigrateOptions = {},
        destroyAll = false
    ): Promise<void> {
        const { arquebus, migrator } = await this.setupConnection(config)

        const paths = await Utils.getMigrationPaths(
            this.basePath ?? process.cwd(),
            migrator,
            config.migrations!.path,
            options.path!
        )

        await migrator.setOutput(true).rollback(paths, {
            step: options.step || 0,
            pretend: options.pretend,
            batch: options.batch || 0,
        })

        if (destroyAll) {
            await arquebus.destroyAll()
        }
    }

    /**
     * Prepares the database for migration
     * 
     * @param migrator 
     */
    async prepareDatabase (migrator: Migrator): Promise<void> {
        const exists = await migrator.repositoryExists()

        if (!exists) {
            this.callback('INFO: Preparing database.', 'info')
            this.callback('INFO: Creating migration table...', 'info')
            await migrator.repository.createRepository()
            this.callback('SUCCESS: Migration table created successfully.', 'success')
        }
    }

    /**
     * Check the status of available migrations
     * 
     * @param config 
     * @param options 
     * @param destroyAll 
     * @returns 
     */
    async status (config: TXBaseConfig, options: MigrateOptions = {}, destroyAll = false): Promise<MigrationStatus[]> {
        const { arquebus, migrator } = await this.setupConnection(config)

        const getAllMigrationFiles = async (): Promise<Record<string, string>> => {
            return await migrator.getMigrationFiles(
                await Utils.getMigrationPaths(
                    this.basePath ?? process.cwd(),
                    migrator,
                    config.migrations!.path,
                    options.path!
                )
            )
        }

        async function getStatusFor (ran: string[], batches: Record<string, number>): Promise<MigrationStatus[]> {
            const files = await getAllMigrationFiles()
            return Object.values(files).map((migration) => {
                const migrationName = migrator.getMigrationName(migration)
                return {
                    name: migrationName,
                    ran: ran.includes(migrationName),
                    batch: ran.includes(migrationName) ? batches[migrationName] : null
                }
            })
        }

        const exists = await migrator.repositoryExists()

        if (!exists) {
            this.callback('ERROR: Migration table does not exist.', 'error')
        }

        const ran = await migrator.repository.getRan() as any
        const batches = await migrator.getRepository().getMigrationBatches()

        const migrations = await getStatusFor(ran, batches)

        if (destroyAll) {
            await arquebus.destroyAll()
        }
        return migrations
    }

    /**
     * Setup the database connection
     * 
     * @param config 
     * @returns 
     */
    async setupConnection (config: TXBaseConfig): Promise<{ arquebus: typeof arquebus, migrator: Migrator }> {
        const table = config?.migrations?.table || 'migrations'

        if (!config.skipConnection) {
            arquebus.addConnection(config, 'default')
            Object.entries(config.connections || {}).forEach(([name, connection]) => {
                arquebus.addConnection(connection, name)
            })
        }

        const repository = new MigrationRepository(arquebus, table)
        const migrator = new Migrator(repository, arquebus)
        return { arquebus, migrator }
    }
}

import MigrationRepository from './migrations/migration-repository'
import Migrator from './migrations/migrator'
import arquebus from './arquebus'
import { getMigrationPaths } from '../bin/utils'
async function prepareDatabase (migrator) {
    const exists = await migrator.repositoryExists()
    if (!exists) {
        console.log('Preparing database.')
        console.log('Creating migration table...')
        await migrator.repository.createRepository()
        console.log('Migration table created successfully.')
    }
}
async function setupConnection (config) {
    const table = config?.migration?.table || 'migrations'
    arquebus.addConnection(config, 'default')
    Object.entries(config.connections || {}).forEach(([name, connection]) => {
        arquebus.addConnection(connection, name)
    })
    const repository = new MigrationRepository(arquebus, table)
    const migrator = new Migrator(repository, arquebus)
    return { arquebus, migrator }
}
async function migrateRun (config, options = {}, destroyAll = false) {
    const { arquebus, migrator } = await setupConnection(config)
    await prepareDatabase(migrator)
    const paths = await getMigrationPaths(process.cwd(), migrator, config?.migrations?.path, options.path)
    await migrator.setOutput(true).run(paths, {
        step: options.step,
        pretend: options.pretend,
    })
    if (destroyAll) {
        await arquebus.destroyAll()
    }
}
async function migrateRollback (config, options = {}, destroyAll = false) {
    const { arquebus, migrator } = await setupConnection(config)
    const paths = await getMigrationPaths(process.cwd(), migrator, config?.migrations?.path, options.path)
    await migrator.setOutput(true).rollback(paths, {
        step: options.step || 0,
        pretend: options.pretend,
        batch: options.batch || 0,
    })
    if (destroyAll) {
        await arquebus.destroyAll()
    }
}
async function migrateStatus (config, options = {}, destroyAll = false) {
    const { arquebus, migrator } = await setupConnection(config)
    async function getAllMigrationFiles () {
        return await migrator.getMigrationFiles(await getMigrationPaths(process.cwd(), migrator, config?.migrations?.path, options.path))
    }
    async function getStatusFor (ran, batches) {
        const files = await getAllMigrationFiles()
        return Object.values(files).map(function (migration) {
            const migrationName = migrator.getMigrationName(migration)
            const status = {
                name: migrationName,
                ran: ran.includes(migrationName),
                batch: ran.includes(migrationName) ? batches[migrationName] : null
            }
            return status
        })
    }
    const exists = await migrator.repositoryExists()
    if (!exists) {
        throw new Error('Migration table does not exist.')
    }
    const ran = await migrator.repository.getRan()
    const batches = await migrator.getRepository().getMigrationBatches()
    const migrations = await getStatusFor(ran, batches)
    if (destroyAll) {
        await arquebus.destroyAll()
    }
    return migrations
}
export { migrateRun }
export { migrateRollback }
export { migrateStatus }
export default {
    migrateRun,
    migrateRollback,
    migrateStatus
}

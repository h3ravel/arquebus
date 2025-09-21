import type { TBaseConfig } from 'types/container'
import type { TGeneric } from 'types/generics'
import type arquebus from 'src/arquebus'

export class MigrationRepository {
    resolver: typeof arquebus
    table
    connection: TBaseConfig['client'] | null = null
    constructor(resolver: typeof arquebus, table: string) {
        this.resolver = resolver
        this.table = table
    }
    async getRan () {
        return await this.getTable()
            .orderBy('batch', 'asc')
            .orderBy('migration', 'asc')
            .pluck('migration')
    }
    async getMigrations (steps: number) {
        const query = this.getTable().where('batch', '>=', '1')
        return (await query.orderBy('batch', 'desc')
            .orderBy('migration', 'desc')
            .take(steps).get())
    }
    async getMigrationsByBatch (batch: number) {
        return (await this.getTable()
            .where('batch', batch)
            .orderBy('migration', 'desc')
            .get())
    }
    async getLast () {
        const query = this.getTable().where('batch', await this.getLastBatchNumber())
        return (await query.orderBy('migration', 'desc').get())
    }
    async getMigrationBatches () {
        const migrations = await this.getTable()
            .select('batch', 'migration')
            .orderBy('batch', 'asc')
            .orderBy('migration', 'asc')
            .get()

        const migrationBatches: TGeneric = {}
        migrations.map((migration: any) => {
            migrationBatches[migration.migration] = migration.batch
        })
        return migrationBatches
    }
    async log (file: string, batch: number) {
        await this.getTable().insert({
            migration: file,
            batch: batch
        })
    }
    async delete (migration: TGeneric) {
        await this.getTable().where('migration', migration.migration).delete()
    }
    async getNextBatchNumber () {
        return (await this.getLastBatchNumber()) + 1
    }
    async getLastBatchNumber () {
        return await this.getTable().max('batch')
    }
    async createRepository () {
        const schema = this.getConnection().schema
        await schema.createTable(this.table, function (table) {
            table.increments('id')
            table.string('migration')
            table.integer('batch')
        })
    }
    repositoryExists () {
        const schema = this.getConnection().schema
        return schema.hasTable(this.table)
    }
    async deleteRepository () {
        const schema = this.getConnection().schema
        await schema.drop(this.table)
    }
    getTable () {
        return this.getConnection().table(this.table)
    }
    getConnection () {
        return this.resolver.connection(this.connection)
    }
    setSource (name: TBaseConfig['client']) {
        this.connection = name
    }
}

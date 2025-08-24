import { existsSync, readFileSync } from 'node:fs'

import type { TFunction } from 'types/generics'
import dayjs from 'dayjs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import path from 'path'

class MigrationCreator {
    private postCreate: TFunction[] = []

    constructor(private customStubPath?: string, private type: 'ts' | 'js' = 'js') {
    }

    /**
     * Create a new migration file
     * 
     * @param name 
     * @param dir 
     * @param table 
     * @param create 
     * @returns 
     */
    async create (name: string, dir: string, table: string, create: boolean = false) {
        const stub = this.getStub(table, create)
        const filePath = this.getPath(name, dir)

        await this.ensureDirectoryExists(path.dirname(filePath))
        await fs.writeFile(filePath, this.populateStub(stub, table))
        await this.firePostCreateHooks(table, filePath)
        return filePath
    }

    /**
     * Publish migrations from third party vendors
     * 
     * @param dir 
     * @param callback 
     */
    async publish (dir: string, callback?: (name: string, source: string, dest: string) => void) {
        const migrationFiles = await fs.readdir(this.customStubPath ?? '')
        await this.ensureDirectoryExists(dir)

        for (const migrationFile of migrationFiles) {
            const sourceFilePath = path.join(this.customStubPath ?? '', migrationFile)
            const destinationFilePath = path.join(dir, migrationFile)
            await fs.copyFile(sourceFilePath, destinationFilePath)

            if (callback) callback(migrationFile, sourceFilePath, destinationFilePath)
        }
    }

    getStub (table?: string, create: boolean = false) {
        let stub: string
        if (!table) {
            const customPath = path.join(this.customStubPath ?? '', `migration-${this.type}.stub`)
            console.log('\n', customPath, '---')
            stub = existsSync(customPath) ? customPath : this.stubPath(`/migration-${this.type}.stub`)
        }
        else if (create) {
            const customPath = path.join(this.customStubPath ?? '', `migration.create-${this.type}.stub`)
            stub = existsSync(customPath) ? customPath : this.stubPath(`/migration.create-${this.type}.stub`)
        }
        else {
            const customPath = path.join(this.customStubPath ?? '', `migration.update-${this.type}.stub`)
            stub = existsSync(customPath) ? customPath : this.stubPath(`/migration.update-${this.type}.stub`)
        }
        return readFileSync(stub, 'utf-8')
    }

    populateStub (stub: string, table: string) {
        if (table !== null) {
            stub = stub.replace(/DummyTable|{{\s*table\s*}}/g, table)
        }
        return stub
    }

    getClassName (name: string) {
        return name.replace(/_+([a-z])/g, (match, char) => char.toUpperCase())
    }

    getPath (name: string, dir: string) {
        const datePrefix = dayjs().format('YYYY_MM_DD_HHmmss')
        return path.join(dir, `${datePrefix}_${name}.${this.type}`)
    }

    async firePostCreateHooks (table: string, filePath: string) {
        for (const callback of this.postCreate) {
            await callback(table, filePath)
        }
    }
    afterCreate (callback: TFunction) {
        this.postCreate.push(callback)
    }

    async ensureDirectoryExists (dir: string) {
        await fs.mkdir(dir, { recursive: true })
    }

    stubPath (stub: string = '') {
        const __dirname = this.getDirname(import.meta as any)
        return path.join(__dirname, 'stubs', stub)
    }

    getDirname (meta: ImportMeta | null) {
        if (typeof __dirname !== 'undefined') {
            // CJS build
            return __dirname
        }
        if (meta && meta.url) {
            // ESM build
            return dirname(fileURLToPath(meta.url))
        }
        throw new Error('Unable to determine dirname')
    }
}
export default MigrationCreator

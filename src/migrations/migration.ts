import type { QueryBuilder } from 'src/query-builder'
import type { SchemaBuilder } from 'types/query-builder'
import type { TBaseConfig } from 'types/container'

/*
 * Migration contract
 */
export interface IMigration {
    withinTransaction?: boolean
    up (schema: SchemaBuilder, connection?: QueryBuilder): Promise<any>;
    down (schema: SchemaBuilder, connection?: QueryBuilder): Promise<any>;
    getConnection (): TBaseConfig['client']
}

const Inference = class { } as { new(): IMigration }

export class Migration extends Inference {
    protected connection!: TBaseConfig['client']
    withinTransaction: boolean = true

    getConnection (): TBaseConfig['client'] {
        return this.connection
    }
}

export default Migration

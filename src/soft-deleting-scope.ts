import type Builder from './builder'
import type { IStatement } from 'types/query-builder'
import type { Model } from './model'
import Scope from './scope'
import { tap } from './utils'

const hasJoins = (statements: IStatement[]) => {
    for (const statement of statements) {
        if (statement?.grouping === 'join') {
            return true
        }
    }
    return false
}

class SoftDeletingScope extends Scope {
    extensions = [
        'Restore',
        'RestoreOrCreate',
        'CreateOrRestore',
        'WithTrashed',
        'WithoutTrashed',
        'OnlyTrashed'
    ] as const

    apply (builder: any, model: Model) {
        builder.whereNull(model.getQualifiedDeletedAtColumn())
    }
    extend (builder: Builder<any>) {
        for (const extension of this.extensions) {
            this[`add${extension}`](builder)
        }
        builder.onDelete(async (builder) => {
            const column = this.getDeletedAtColumn(builder)
            return await builder.update({
                [column]: builder.getModel().freshTimestampString(),
            })
        })
    }
    getDeletedAtColumn (builder: Builder<any>) {
        if (hasJoins(builder.getQuery()._statements)) {
            return builder.getModel().getQualifiedDeletedAtColumn()
        }
        return builder.getModel().getDeletedAtColumn()
    }
    addRestore (builder: Builder<any>) {
        builder.macro('restore', (builder) => {
            builder.withTrashed()
            return builder.update({
                [builder.getModel().getDeletedAtColumn()]: null
            })
        })
    }
    addRestoreOrCreate (builder: Builder<any>) {
        builder.macro('restoreOrCreate', async (builder, attributes = {}, values = {}) => {
            builder.withTrashed()
            return tap(await builder.firstOrCreate(attributes, values), async (instance) => {
                await instance.restore()
            })
        })
    }
    addCreateOrRestore (builder: Builder<any>) {
        builder.macro('createOrRestore', async (builder, attributes = {}, values = {}) => {
            builder.withTrashed()
            return tap(await builder.createOrFirst(attributes, values), async (instance) => {
                await instance.restore()
            })
        })
    }
    addWithTrashed (builder: Builder<any>) {
        builder.macro('withTrashed', (builder, withTrashed = true) => {
            if (!withTrashed) {
                return builder.withoutTrashed()
            }
            return builder.withoutGlobalScope(this)
        })
    }
    addWithoutTrashed (builder: Builder<any>) {
        builder.macro('withoutTrashed', (builder) => {
            const model = builder.getModel()
            builder.withoutGlobalScope(this).whereNull(model.getQualifiedDeletedAtColumn())
            return builder
        })
    }
    addOnlyTrashed (builder: Builder<any>) {
        builder.macro('onlyTrashed', (builder) => {
            const model = builder.getModel()
            builder.withoutGlobalScope(this).whereNotNull(model.getQualifiedDeletedAtColumn())
            return builder
        })
    }
}
export default SoftDeletingScope

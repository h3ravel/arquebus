import type { MixinConstructor } from 'types/generics'

const UniqueIds = <TBase extends MixinConstructor> (Model: TBase) => {
    return class extends Model {
        useUniqueIds = false
        usesUniqueIds () {
            return this.useUniqueIds
        }
        uniqueIds () {
            return []
        }
        // newUniqueId (): string {
        //     return ''
        // }
        // newUniqueId = () => ''
        setUniqueIds () {
            const uniqueIds = this.uniqueIds()
            for (const column of uniqueIds) {
                if (this[column] === null || this[column] === undefined) {
                    this[column] = this.newUniqueId()
                }
            }
        }
    }
}
export default UniqueIds

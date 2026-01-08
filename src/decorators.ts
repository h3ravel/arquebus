

/**
 * Relationship Decorator
 * Supports: _user() -> user and relationUser() -> user
 * 
 * @param value 
 * @param context 
 */
export function Relation (target: any, context?: any, descriptor?: any) {
    // Unified Detection (Modern vs Legacy)
    const isModern = context && typeof context === 'object' && 'kind' in context
    const propertyKey = (isModern ? context.name : context) as string
    const originalMethod = isModern ? target : descriptor.value

    // Derive naming: _user -> user, relationUser -> user
    let internalMethodName: string
    let rootName = propertyKey.replace(/^(_|relation)/, '')

    if (propertyKey.startsWith('_')) {
        rootName = propertyKey.slice(1)
        internalMethodName = `relation${rootName.charAt(0).toUpperCase()}${rootName.slice(1)}`
    } else if (propertyKey.startsWith('relation')) {
        rootName = propertyKey.replace(/^relation/, '').replace(/^\w/, c => c.toLowerCase())
        internalMethodName = `_${rootName}`
    }

    const setupProperty = (proto: any, logicFn: () => any) => {
        // The internal alias (ensure _user exists for framework logic)
        if (!Object.prototype.hasOwnProperty.call(proto, internalMethodName)) {
            Object.defineProperty(proto, internalMethodName, {
                value: logicFn,
                writable: true, configurable: true, enumerable: false
            })
        }

        // The Magic Property Getter (Handles all Async processes)
        if (!Object.getOwnPropertyDescriptor(proto, rootName)) {
            Object.defineProperty(proto, rootName, {
                async get () {
                    //  Return from cache if exists
                    if (this.$relations && this.$relations[rootName] != null) {
                        return this.$relations[rootName]
                    }

                    // Await the database (The decorator handles the async process)
                    const result = await this.getRelated(rootName)

                    // Populate cache
                    if (!this.$relations) this.$relations = {}
                    this.$relations[rootName] = result

                    return result
                },
                set (val: any) {
                    if (!this.$relations) this.$relations = {}
                    this.$relations[rootName] = val
                },
                enumerable: true,
                configurable: true,
            })
        }
    }

    if (isModern) {
        // Modern TS 5.0+ Path
        context.addInitializer(function (this: any) {
            setupProperty(Object.getPrototypeOf(this), originalMethod)
        })
    } else {
        // Legacy Path
        setupProperty(target, originalMethod)
        return descriptor
    }
}
import type { MixinConstructor, TGeneric } from 'types/generics'

/**
 * Helper type to extract instance type from constructor or mixin function
 */
type Constructor<T = TGeneric> = MixinConstructor<T>
type Mixin<TBase extends Constructor> = (Base: TBase) => Constructor

/**
 * Helper type to convert union to intersection
 */
type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never

/**
 * Helper type to get static side of a constructor
 */
type Static<T> = {
    [K in keyof T]: T[K]
}

/**
 * Compose function that merges multiple classes and mixins
 * 
 * @example
 * const SomePlugin = <TBase extends new (...args: any[]) => TGeneric> (Base: TBase) => {
 *     return class extends Base {
 *         pluginAttribtue = 'plugin'
 *         pluginMethod () {
 *             return this.pluginAttribtue
 *         }
 *     }
 * }
 *
 * // Base class
 * class Model {
 *     make () {
 *         console.log('make')
 *     }
 *     pluginMethod (id: string) {
 *     }
 * }
 *
 * class User extends compose(
 *     Model,
 *     SomePlugin,
 * ) {
 *     relationPosts () {
 *         return 'hasMany Posts'
 *     }
 * }
 *
 * const user = new User()
 * user.make() // from Model
 * user.pluginMethod() // from SomePlugin
 * user.relationPosts() // from User
 *
 * console.log(user.pluginMethod('w')) // "plugin"
 * console.log(user.pluginMethod()) // "plugin"
 * console.log(user.relationPosts()) // "hasMany Posts"
 * 
 * @param Base 
 * @param mixins 
 * @returns 
 */
export function compose<
    TBase extends Constructor,
    TMixins extends Array<Mixin<any> | Constructor>
> (
    Base: TBase,
    ...mixins: TMixins
): Constructor<
    InstanceType<TBase> &
    UnionToIntersection<
        {
            [K in keyof TMixins]: TMixins[K] extends Mixin<any>
            ? InstanceType<ReturnType<TMixins[K]>>
            : TMixins[K] extends Constructor
            ? InstanceType<TMixins[K]>
            : never
        }[number]
    >
> &
    UnionToIntersection<
        {
            [K in keyof TMixins]: TMixins[K] extends Mixin<any>
            ? Static<ReturnType<TMixins[K]>>
            : TMixins[K] extends Constructor
            ? Static<TMixins[K]>
            : never
        }[number]
    > &
    Static<TBase> {
    /**
     * Apply each mixin or class in sequence
     */
    return mixins.reduce((acc, mixin) => {
        if (typeof mixin === 'function' && mixin.prototype) {
            /**
             * If it's a class constructor, extend it
             */
            return class extends (acc as Constructor) {
                constructor(...args: any[]) {
                    super(...args)
                    /**
                     * Copy instance properties from mixin prototype
                     */
                    Object.getOwnPropertyNames(mixin.prototype).forEach(name => {
                        if (name !== 'constructor') {
                            Object.defineProperty(
                                this,
                                name,
                                Object.getOwnPropertyDescriptor(mixin.prototype, name)!
                            )
                        }
                    })
                }
            }
        } else if (typeof mixin === 'function') {
            /**
             * If it's a mixin function, call it with current class
             */
            return (mixin as any)(acc as Constructor)
        }
        return acc
    }, Base) as any
} 

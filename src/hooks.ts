type HookName =
  | 'creating'
  | 'created'
  | 'updating'
  | 'updated'
  | 'saving'
  | 'saved'
  | 'deleting'
  | 'deleted'
  | 'restoring'
  | 'restored'
  | 'trashed'
  | 'forceDeleting'
  | 'forceDeleted'

/*
 * Each hook is just a callback that can receive arbitrary args
 */
type HookCallback = (...args: any[]) => unknown

class Hooks {
  hooks: Record<HookName, HookCallback[]> = {
    creating: [],
    created: [],
    updating: [],
    updated: [],
    saving: [],
    saved: [],
    deleting: [],
    deleted: [],
    restoring: [],
    restored: [],
    trashed: [],
    forceDeleting: [],
    forceDeleted: [],
  }

  add(hook: HookName, callback: HookCallback): void {
    this.hooks[hook].push(callback)
  }

  async exec(hook: HookName, data: any[]): Promise<boolean> {
    const callbacks = this.hooks[hook] ?? []
    for (const callback of callbacks) {
      await callback(...data)
    }
    return true
  }
}

export default Hooks

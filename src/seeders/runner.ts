import type QueryBuilder from 'src/query-builder'
import type Seeder from './seeder'
import type { TBaseConfig } from 'types/container'
import { access } from 'node:fs/promises'
import type { arquebus } from 'src'
import path from 'path'

async function glob (folderPath: string): Promise<string[]> {
  const { default: escalade } = await import('escalade')
  const entries: string[] = []
  const root = folderPath
  await escalade(root, async (dir, names) => {
    await Promise.all(
      names.map(async (name) => {
        const p = path.join(dir, name)
        try {
          await access(p)
          if (p.endsWith('.js') || p.endsWith('.ts')) entries.push(p)
        } catch {
          /** */
        }
      }),
    )
    return ''
  })
  return entries
}

export class SeederRunner {
  resolver: typeof arquebus
  connection!: TBaseConfig['client']
  paths: string[] = []

  constructor(resolver: typeof arquebus) {
    this.resolver = resolver
  }

  path (p: string): void {
    this.paths = Array.from(new Set([...this.paths, p]))
  }

  getPaths (): string[] {
    return this.paths
  }

  resolveConnection (connection?: TBaseConfig['client']): QueryBuilder {
    const name = connection || this.connection || 'default'
    // If the resolver has no connection manager entry, attempt to autoload config
    const instance: any = (this.resolver as any).getInstance?.() ?? null
    const hasConn = !!instance?.connections?.[name]
    if (!hasConn) {
      // Attempt autoload; do not throw if empty
      this.resolver
        .autoLoad()
        .catch(() => {
          /** noop */
        })
    }
    return this.resolver.fire(name)
  }

  setConnection (connection: TBaseConfig['client']): this {
    this.connection = connection
    return this
  }

  async getSeederFiles (paths: string[]): Promise<string[]> {
    const files: string[] = []
    for (const p of paths) {
      if (p.endsWith('.js') || p.endsWith('.ts')) {
        files.push(p)
        continue
      }
      files.push(...(await glob(p)))
    }
    return files
  }

  async resolvePath (filePath: string): Promise<Seeder | null> {
    try {
      const mod = await import(filePath)
      const instance = new (mod.default ?? mod.Seeder)()
      return instance as Seeder
    } catch {
      return null
    }
  }

  async run (paths: string[], connection?: TBaseConfig['client']): Promise<void> {
    const files = await this.getSeederFiles(paths)
    const conn = this.resolveConnection(connection)
    for (const file of files) {
      const seeder = await this.resolvePath(file)
      if (seeder && typeof seeder.run === 'function') {
        await seeder.run(conn)
      }
    }
  }
}

export default SeederRunner

import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { dirname } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'path'

export class SeederCreator {
  constructor(private customStubPath?: string) { }

  async create (dir: string, name: string, type: 'js' | 'ts' = 'js') {
    await mkdir(dir, { recursive: true })

    const stubPath = this.getStubPath(type)
    let stub = await readFile(stubPath, 'utf-8')
    stub = stub.replace(/{{ name }}/g, name)

    const filePath = path.join(dir, `${name}.${type}`)
    await writeFile(filePath, stub)

    return filePath
  }

  getStubPath (type: 'js' | 'ts') {
    if (this.customStubPath) return path.join(this.customStubPath, `seeder-${type}.stub`)
    const __dirname = this.getDirname(import.meta as any)
    const name = `seeder-${type}.stub`
    const candidates = [
      path.join(__dirname, 'stubs', name),
      path.join(__dirname, '../stubs', name),
    ]
    const resolved = candidates.find((candidate) => existsSync(candidate))

    if (!resolved) throw new Error(`Seeder stub not found: ${name}`)

    return resolved
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

export default SeederCreator

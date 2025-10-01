import { access } from 'fs/promises'
import escalade from 'escalade/sync'
import path from 'path'
import resolveFrom from 'resolve-from'

const join = path.join

export class Utils {
  /**
   * Wraps text with chalk
   *
   * @param txt
   * @param color
   * @returns
   */
  static textFormat(txt: any, color: (txt: string) => string) {
    return String(txt)
      .split(':')
      .map((e, i, a) => (i == 0 && a.length > 1 ? color(' ' + e + ': ') : e))
      .join('')
  }

  static findModulePkg(moduleId: string, cwd?: string) {
    const parts = moduleId.replace(/\\/g, '/').split('/')
    let packageName = ''
    // Handle scoped package name
    if (parts.length > 0 && parts[0][0] === '@') {
      packageName += parts.shift() + '/'
    }
    packageName += parts.shift()

    const packageJson = path.join(packageName, 'package.json')

    const resolved = resolveFrom.silent(cwd ?? process.cwd(), packageJson)

    if (!resolved) {
      return
    }

    return path.join(path.dirname(resolved), parts.join('/'))
  }

  static async getMigrationPaths(
    cwd: string,
    migrator: any,
    defaultPath: string,
    path: string,
  ) {
    if (path) {
      return [join(cwd, path)]
    }
    return [...migrator.getPaths(), join(cwd, defaultPath)]
  }

  /**
   * Check if file exists
   *
   * @param path
   * @returns
   */
  static async fileExists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }

  static findUpConfig(cwd: string, name: string, extensions: string[]) {
    return escalade(cwd, (_dir, names) => {
      for (const ext of extensions) {
        const filename = `${name}.${ext}`
        if (names.includes(filename)) {
          return filename
        }
      }
      return false
    })
  }
}

class TableGuesser {
  static CREATE_PATTERNS = [/^create_(\w+)_table$/, /^create_(\w+)$/]
  static CHANGE_PATTERNS = [
    /.+_(to|from|in)_(\w+)_table$/,
    /.+_(to|from|in)_(\w+)$/,
  ]
  static guess(migration: string) {
    for (const pattern of TableGuesser.CREATE_PATTERNS) {
      const matches = migration.match(pattern)
      if (matches) {
        return [matches[1], true]
      }
    }
    for (const pattern of TableGuesser.CHANGE_PATTERNS) {
      const matches = migration.match(pattern)
      if (matches) {
        return [matches[2], false]
      }
    }
    return []
  }
}

export { TableGuesser }

export default {
  Utils,
  TableGuesser,
}

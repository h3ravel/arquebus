import path from 'path'
import resolveFrom from 'resolve-from'

const join = path.join

export class Utils {
  static findModulePkg (moduleId: string, cwd?: string) {
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

  static async getMigrationPaths (
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
}

class TableGuesser {
  static CREATE_PATTERNS = [/^create_(\w+)_table$/, /^create_(\w+)$/]
  static CHANGE_PATTERNS = [
    /.+_(to|from|in)_(\w+)_table$/,
    /.+_(to|from|in)_(\w+)$/,
  ]
  static guess (migration: string) {
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

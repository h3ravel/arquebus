// Temporary shims to unblock TypeScript when node_modules are not installed
// Prefer installing real typings: pnpm add -D @types/node
declare module 'node:fs/promises' {
  const anyExport: any
  export = anyExport
}

declare module 'path' {
  const anyExport: any
  export = anyExport
}

declare module 'node:path' {
  export function dirname(path: string): string
  export function join(...paths: string[]): string
  export function basename(path: string, ext?: string): string
  export function resolve(...paths: string[]): string
}

declare module 'chalk' {
  const anyExport: any
  export = anyExport
}

declare module 'dotenv' {
  export function config(opts?: any): any
}

declare module 'commander' {
  export class Command {
    name(name?: string): Command
    version(...args: any[]): Command
    command(nameAndArgs: string): Command
    description(text: string): Command
    addArgument(arg: Argument): Command
    addOption(option: Option): Command
    option(...args: any[]): Command
    action(fn: (...args: any[]) => any): Command
    parse(argv?: string[]): Command
    parseAsync(argv?: string[]): Promise<Command>
  }
  export class Option {
    constructor(flags: string, description?: string)
    choices(values: string[]): Option
    default(value: any, description?: string): Option
  }
  export class Argument {
    constructor(name: string, description?: string)
    choices(values: string[]): Argument
    default(value: any, description?: string): Argument
  }
  export const program: Command
}

declare module 'radashi' {
  export const snake: (input: string) => string
  export const omit: any
  export const remove: any
}

declare module '@h3ravel/shared' {
  export const Logger: any
  export const TaskManager: any
  export const FileSystem: any
}

declare var process: any
export type FileType = 'js' | 'ts'

export interface PathOptions {
    path?: string
}

export interface MigrationOptions extends PathOptions {
    step?: number | string
}

export interface MakeMigrationOptions extends PathOptions {
    type?: FileType
    table?: string
    create?: string | boolean
}

export interface MakeFileOptions extends PathOptions {
    type?: FileType
    force?: boolean
}
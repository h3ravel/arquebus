import { defineConfig } from '@h3ravel/arquebus'

export default defineConfig({
    client: 'mysql2',
    connection: {
        host: 'localhost',
        database: 'arquebus_test',
        user: 'root',
        password: process.env.MYSQL_PASSWORD!
    },
    migrations: {
        table: 'migrations',
        path: './migrations',
    },
    factories: {
        path: './factories',
    },
    seeders: {
        path: './seeders',
    },
    models: {
        path: './models'
    }
})

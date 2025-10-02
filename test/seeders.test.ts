import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import config from './config'
import { arquebus } from 'src'
import { SeederRunner } from 'src/seeders'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

describe('SeederRunner (sqlite)', () => {
  const cfg = config.sqlite
  const base = process.cwd()
  const seedersDir = path.join(base, '.tmp-seeders')

  beforeAll(async () => {
    arquebus.addConnection(cfg, 'default')
    await mkdir(seedersDir, { recursive: true })
    const seederFile = path.join(seedersDir, 'users-seeder.js')
    await writeFile(
      seederFile,
      `export default class UsersSeeder {
  async run(connection) {
    await connection.schema.createTable('users', (t) => {
      t.increments('id')
      t.string('name')
    })
    await connection.table('users').insert({ name: 'Seeded User' })
  }
}
`
    )
  })

  afterAll(async () => {
    await arquebus.destroyAll()
  })

  it('runs seeder and inserts data', async () => {
    const runner = new SeederRunner(arquebus).setConnection(cfg.client)
    await runner.run([seedersDir])
    const conn = arquebus.fire(cfg.client)
    const row = await conn.table('users').first(['name'])
    expect(row?.name).toBe('Seeded User')
  })
})
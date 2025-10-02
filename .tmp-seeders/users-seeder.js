export default class UsersSeeder {
  async run(connection) {
    await connection.schema.createTable('users', (t) => {
      t.increments('id')
      t.string('name')
    })
    await connection.table('users').insert({ name: 'Seeded User' })
  }
}

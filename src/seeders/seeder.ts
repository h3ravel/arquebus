import type QueryBuilder from 'src/query-builder'

export abstract class Seeder {
  /**
   * Run the database seeds
   */
  abstract run(connection: QueryBuilder): Promise<void>
}

export default Seeder
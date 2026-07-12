import type { Collection } from '../src'
import {
  Model,
  arquebus,
  type ModelBuilder,
  type Paginator,
  type TypedArquebus,
} from '../src'
import type { Collection as ValueCollection } from '@h3ravel/collect.js'

interface PostAttributes {
  id: number
  title: string
  published: boolean
}

class Post extends Model.define<PostAttributes, {}, 'posts'>() { }

interface UserAttributes {
  id: number
  email: string
  age: number | null
  active: boolean
}

interface UserRelations {
  posts: Collection<Post>
}

class User extends Model.define<UserAttributes, UserRelations, 'users'>() {
  relationPosts() {
    return this.hasMany(Post)
  }
}

const user = new User({
  id: 1,
  email: 'ada@example.com',
  age: null,
  active: true,
})

const id: number = user.id
const email: string = user.email
const attributes: UserAttributes = user.getAttributes()
const serialized: UserAttributes & Partial<UserRelations> = user.toData()

user.setAttribute('email', 'grace@example.com')
user.fill({ age: 37 })

const query: ModelBuilder<User> = User.query()
query
  .where('email', 'ada@example.com')
  .where('age', '>=', 18)
  .whereIn('id', [1, 2, 3])
  .whereNull('age')
  .orderBy('email')
  .with('posts')

const users: Promise<Collection<User>> = query.get()
const userPage: Promise<Paginator<User>> = query.paginate()
const ages: Promise<ValueCollection<number | null>> = query.pluck('age')

// @ts-expect-error Unknown model columns are rejected.
query.where('missing', 'value')
// @ts-expect-error Values follow the selected column type.
query.where('active', 'yes')
// @ts-expect-error whereIn values follow the selected column type.
query.whereIn('id', ['1'])
// @ts-expect-error Relations are inferred from the model relation map.
query.with('comments')
// @ts-expect-error Constructor attributes use the declared schema.
new User({ email: 42 })
// @ts-expect-error Attribute setters preserve declared value types.
user.setAttribute('age', 'old')

void id
void email
void attributes
void serialized
void users
void userPage
void ages

interface Database {
  users: UserAttributes
  posts: PostAttributes
}

const database: TypedArquebus<Database> = arquebus.withSchema<Database>()
const userRows: Promise<UserAttributes[]> = database
  .table('users')
  .where('active', true)
  .whereIn('id', [1, 2])
  .get()

database.table('posts').insert({ title: 'Typed ORM', published: true })

// @ts-expect-error Table names come from the database schema.
database.table('comments')
// @ts-expect-error Raw table columns are inferred per table.
database.table('users').where('title', 'No title column')
// @ts-expect-error Raw table values follow their column type.
database.table('posts').where('published', 'yes')
// @ts-expect-error Insert values follow the table row schema.
database.table('users').insert({ active: 'yes' })

void userRows

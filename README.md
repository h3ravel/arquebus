<div align="center">
  <a href="https://h3ravel.toneflix.net"  target="_blank">
    <img src="https://raw.githubusercontent.com/h3ravel/assets/refs/heads/main/logo-full.svg" width="200" alt="H3ravel Logo">
  </a>
  <h1 align="center"><a href="https://h3ravel.toneflix.net/arquebus">H3ravel Arquebus</a></h1>

[![Framework][ix]][lx]
[![Arquebus ORM][i1]][l1]
[![Downloads][d1]][d1]
[![Tests][tei]][tel]
[![License][lini]][linl]

</div>

Arquebus ORM is a Beautiful, expressive framework-agnostic Object-Relational Mapper (ORM) inspired by Laravel's Eloquent, designed for TypeScript applications and for the H3ravel Framework that makes it enjoyable to interact with your database. When using Arquebus, each database table has a corresponding "Model" that is used to interact with that table. In addition to retrieving records from the database table, Arquebus models allow you to insert, update, and delete records from the database as well.

> Arquebus is a Typescript and Modern JS rewrite of [Sutando](https://sutando.org/) and is heavily inspired by Laravel's ORM [Eloquent](https://laravel.com/docs/12.x/eloquent).

## ✨ Features

- Supports MySQL, PostgreSQL, SQLite and other databases
- Concise syntax and intuitive operations
- Model relationships for handling complex data queries and operations
- Powerful query builder
- Customized data type conversion for model attributes
- Easy-to-use transaction
- Support for hooks to execute custom logic at different stages of model operations
- Simple plugin mechanism for easy expansion

## Documentation

Check the full documentation on [https://h3ravel.toneflix.net/arquebus](https://h3ravel.toneflix.net/arquebus)

## Quick Start

Let’s take mysql as an example.

Install Arquebus and mysql database library

```sh
$ npm install @h3ravel/arquebus mysql2 --save
```

The easiest way to make SQL queries is to use the Database query builder. It allows you to construct simple and complex SQL queries using JavaScript methods.

```ts
import { arquebus, Model } from '@h3ravel/arquebus';

// Add SQL Connection Info
arquebus.addConnection({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'test',
  },
});

const db = arquebus.fire();

// Query Builder
const users = await db.table('users').where('age', '>', 35).get();

// ORM
class User extends Model {}

// Query Data
const users = await User.query().where('age', '>', 35).get();

// Insert
const user = new User();
user.name = 'David Bowie';
await user.save();

// Delete
await user.delete();

// Pagination
const users = await User.query().paginate();

// Eager Loading
const users = await User.query().with('posts').get();

// Constraining Eager Loads
const users = await User.query()
  .with({
    posts: (q) => q.where('likes_count', '>', 100),
  })
  .get();

// Lazy Eager Loading
await user.load('posts');
```

## Show Your Support

Please ⭐️ this repository if this project helped you

[ix]: https://img.shields.io/npm/v/%40h3ravel%2Fcore?style=flat-square&label=Framework&color=%230970ce
[lx]: https://www.npmjs.com/package/@h3ravel/core
[i1]: https://img.shields.io/npm/v/%40h3ravel%2Farquebus?style=flat-square&label=@h3ravel/arquebus&color=%230970ce
[l1]: https://www.npmjs.com/package/@h3ravel/arquebus
[d1]: https://img.shields.io/npm/dt/%40h3ravel%2Farquebus?style=flat-square&label=Downloads&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40h3ravel%2Farquebus
[linl]: https://github.com/h3ravel/arquebus/blob/main/LICENSE
[lini]: https://img.shields.io/github/license/h3ravel/arquebus
[tel]: https://github.com/h3ravel/arquebus/actions/workflows/tests.yml
[tei]: https://github.com/h3ravel/arquebus/workflows/tests/badge.svg

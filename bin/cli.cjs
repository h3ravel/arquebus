#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/cli/cli.ts
var cli_exports = {};
__export(cli_exports, {
  Cli: () => Cli
});
module.exports = __toCommonJS(cli_exports);
var color2 = __toESM(require("colorette"), 1);

// src/cli/utils.ts
var color = __toESM(require("colorette"), 1);
var import_sync = __toESM(require("escalade/sync"), 1);
var import_path = __toESM(require("path"), 1);
var import_resolve_from = __toESM(require("resolve-from"), 1);
function success(text) {
  console.log(text);
  process.exit(0);
}
function exit(text) {
  if (text instanceof Error) {
    if (text.message) {
      console.error(color.red(text.message));
    }
    console.error(color.red(`${text.detail ? `${text.detail}
` : ""}${text.stack}`));
  } else {
    console.error(color.red(text));
  }
  process.exit(1);
}
function twoColumnDetail(name, value) {
  const regex = /\x1b\[\d+m/g;
  const width = Math.min(process.stdout.columns, 100);
  const dots = Math.max(width - name.replace(regex, "").length - value.replace(regex, "").length - 10, 0);
  return console.log(name, color.gray(".".repeat(dots)), value);
}
function findUpConfig(cwd, name, extensions) {
  return (0, import_sync.default)(cwd, (dir, names) => {
    for (const ext of extensions) {
      const filename = `${name}.${ext}`;
      if (names.includes(filename)) {
        return filename;
      }
    }
    return false;
  });
}
function findModulePkg(moduleId, cwd = "") {
  const parts = moduleId.replace(/\\/g, "/").split("/");
  let packageName = "";
  if (parts.length > 0 && parts[0][0] === "@") {
    packageName += parts.shift() + "/";
  }
  packageName += parts.shift();
  const packageJson = import_path.default.join(packageName, "package.json");
  const resolved = import_resolve_from.default.silent(cwd || process.cwd(), packageJson);
  if (!resolved) {
    return;
  }
  return import_path.default.join(import_path.default.dirname(resolved), parts.join("/"));
}
var join = import_path.default.join;
function localModuleCheck(modulePath) {
  if (!modulePath) {
    console.log(color.red("No local arquebus install found."));
    exit("Try running: npm install arquebus --save");
  }
}
var TableGuesser = class _TableGuesser {
  static CREATE_PATTERNS = [
    /^create_(\w+)_table$/,
    /^create_(\w+)$/
  ];
  static CHANGE_PATTERNS = [
    /.+_(to|from|in)_(\w+)_table$/,
    /.+_(to|from|in)_(\w+)$/
  ];
  static guess(migration) {
    for (const pattern of _TableGuesser.CREATE_PATTERNS) {
      const matches = migration.match(pattern);
      if (matches) {
        return [matches[1], true];
      }
    }
    for (const pattern of _TableGuesser.CHANGE_PATTERNS) {
      const matches = migration.match(pattern);
      if (matches) {
        return [matches[2], false];
      }
    }
    return [];
  }
};

// src/cli/cli.ts
var import_node_fs = require("fs");

// package.json
var package_default = {
  name: "@h3ravel/arquebus",
  version: "0.1.6",
  packageManager: "pnpm@10.14.0",
  description: "Arquebus ORM is a Beautiful, expressive ORM inspired by Laravel's Eloquent, designed for TypeScript applications and for the H3ravel Framework.",
  homepage: "https://h3ravel.net/arquebus",
  bin: {
    arquebus: "./bin/cli.js"
  },
  publishConfig: {
    access: "public"
  },
  main: "./dist/index.cjs",
  module: "./dist/index.js",
  type: "module",
  types: "./dist/index.d.ts",
  files: [
    "dist",
    "bin",
    "src/stubs",
    "src/migrations/stubs"
  ],
  exports: {
    ".": {
      worker: {
        import: {
          types: "./dist/index.d.ts",
          default: "./dist/index.js"
        },
        require: {
          types: "./dist/index.d.ts",
          default: "./dist/index.cjs"
        }
      },
      node: {
        import: {
          types: "./dist/index.d.ts",
          default: "./dist/index.js"
        },
        require: {
          types: "./dist/index.d.ts",
          default: "./dist/index.cjs"
        }
      },
      browser: {
        import: {
          types: "./dist/browser/index.d.ts",
          default: "./dist/browser/index.js"
        },
        require: {
          types: "./dist/browser/index.d.ts",
          default: "./dist/browser/index.cjs"
        }
      },
      default: {
        import: {
          types: "./dist/index.d.ts",
          default: "./dist/index.js"
        },
        require: {
          types: "./dist/index.d.ts",
          default: "./dist/index.cjs"
        }
      }
    },
    "./browser": {
      import: {
        types: "./dist/browser/index.d.ts",
        default: "./dist/browser/index.js"
      },
      require: {
        types: "./dist/browser/index.d.ts",
        default: "./dist/browser/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  repository: {
    type: "git",
    url: "https://github.com/h3ravel/arquebus.git"
  },
  engines: {
    node: ">=14",
    pnpm: ">=4"
  },
  scripts: {
    build: "tsup",
    lint: "eslint . --ext .ts",
    cmd: "cross-env TEST=true tsx --experimental-specifier-resolution=node src/cli",
    "test:mysql": "cross-env DB=mysql vitest --project node",
    "test:postgres": "cross-env DB=postgres vitest --project node",
    "test:sqlite": "cross-env DB=sqlite vitest --project node",
    "test:browser": "vitest --project browser"
  },
  husky: {
    hooks: {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,json}": [
      "prettier --write",
      "git add"
    ]
  },
  dependencies: {
    "collect.js": "^4.36.1",
    colorette: "^2.0.20",
    commander: "^11.1.0",
    dayjs: "^1.11.13",
    dotenv: "^17.2.1",
    escalade: "^3.2.0",
    knex: "^3.1.0",
    pluralize: "^8.0.0",
    radashi: "^12.6.2",
    "resolve-from": "^5.0.0"
  },
  devDependencies: {
    "@eslint/js": "^9.33.0",
    "@types/node": "^24.3.0",
    "@types/pluralize": "^0.0.33",
    "@typescript-eslint/eslint-plugin": "^8.40.0",
    "@typescript-eslint/parser": "^8.40.0",
    "cross-env": "^7.0.3",
    eslint: "^9.33.0",
    husky: "^8.0.3",
    jsdom: "^26.1.0",
    "lint-staged": "^13.3.0",
    mysql2: "3.12.0",
    pg: "8.8.0",
    prettier: "2.6.2",
    sqlite3: "5.1.7",
    tedious: "15.1.0",
    "ts-node": "^10.9.2",
    tsup: "^8.5.0",
    tsx: "^4.20.4",
    typescript: "^5.9.2",
    "typescript-eslint": "^8.40.0",
    "vite-tsconfig-paths": "^5.1.4",
    vitest: "^3.2.4"
  },
  keywords: [
    "arquebus",
    "ORM",
    "mysql",
    "mariadb",
    "sqlite",
    "postgresql",
    "postgres",
    "pg",
    "mssql",
    "active record"
  ],
  readmeFilename: "README.md",
  license: "MIT"
};

// src/cli/cli.ts
var import_dotenv = require("dotenv");
var import_path2 = __toESM(require("path"), 1);
var import_commander = require("commander");
var import_radashi = require("radashi");
var Cli = class _Cli {
  static init() {
    (0, import_dotenv.config)({ quiet: true });
    new _Cli().run(process.env.TEST === "true" ? "test/cli" : "");
  }
  async modulePath() {
    const cwd = process.cwd();
    return findModulePkg("@h3ravel/arquebus", cwd) ?? "";
  }
  async configPath(cwd) {
    return findUpConfig(cwd, "arquebus.config", ["js", "cjs"]) ?? void 0;
  }
  async package() {
    try {
      return await import(import_path2.default.join(await this.modulePath(), "package.json"));
    } catch {
      return { version: "N/A" };
    }
  }
  async run(basePath = "") {
    const cwd = import_path2.default.join(process.cwd(), basePath);
    const modulePath = await this.modulePath();
    const configPath = await this.configPath(cwd);
    const modulePackage = await this.package();
    function getArquebusModule() {
      localModuleCheck(modulePath);
    }
    const cliVersion = [
      "Arquebus CLI version:",
      color2.green(package_default.version)
    ].join(" ");
    const localVersion = [
      "Arquebus Local version:",
      color2.green(modulePackage.version || "None")
    ].join(" ");
    import_commander.program.name("arquebus").version(`${cliVersion}
${localVersion}`);
    import_commander.program.command("init").description("Create a fresh arquebus config.").action(async () => {
      localModuleCheck(modulePath);
      const type = "js";
      console.log(configPath);
      if (configPath) {
        exit(`Error: ${configPath} already exists`);
      }
      try {
        const stubPath = `./arquebus.config.${type}`;
        const code = (0, import_node_fs.readFileSync)(import_path2.default.join(modulePath, `/src/stubs/arquebus.config-${type}.stub`), { encoding: "utf8" });
        (0, import_node_fs.writeFileSync)(stubPath, code);
        success(color2.green(`Created ${stubPath}`));
      } catch (e) {
        exit(String(e));
      }
    });
    import_commander.program.command("migrate:make <name>").description("Create a new migration file.").option("--table", "The table to migrate").option("--create", "The table to be created").action(async (name, opts) => {
      if (!configPath) {
        exit("Error: arquebus config not found. Run `arquebus init` first.");
      }
      try {
        name = (0, import_radashi.snake)(name);
        let table = opts.table;
        let create = opts.create || false;
        if (!table && typeof create === "string") {
          table = create;
          create = true;
        }
        if (!table) {
          const guessed = TableGuesser.guess(name);
          table = guessed[0];
          create = guessed[1];
        }
        const MigrationCreator = getArquebusModule("src/migrations/migration-creator");
        const creator = new MigrationCreator("");
        const fileName = await creator.create(name, cwd + `/${config?.migrations?.path || "migrations"}`, table, create);
        success(color2.green(`Created Migration: ${fileName}`));
      } catch (err) {
        exit(err);
      }
    });
    import_commander.program.command("migrate:publish <package>").description("Publish any migration files from packages.").action(async (pkg, _opts) => {
      if (!configPath) {
        exit("Error: arquebus config not found. Run `arquebus init` first.");
      }
      try {
        const packagePath = findModulePkg(pkg);
        if (!packagePath) {
          exit(`Error: package ${pkg} not found`);
        }
        const MigrationCreator = getArquebusModule("src/migrations/migration-creator");
        const creator = new MigrationCreator(import_path2.default.join(packagePath, "migrations"));
        console.log(color2.green("Publishing migrations:"));
        const _fileNames = await creator.publish(cwd + `/${config?.migrations?.path || "migrations"}`, (fileName, oldPath, newPath) => {
          console.log(newPath + " " + color2.green("DONE"));
        });
      } catch (err) {
        exit(err);
      }
    });
    import_commander.program.command("migrate:run").description("Run all pending migrations.").option("--step", "Force the migrations to be run so they can be rolled back individually.").option("--path <path>", "The path to the migrations directory.").action(async (opts) => {
      if (!configPath) {
        exit("Error: arquebus config not found. Run `arquebus init` first.");
      }
      try {
        const { migrateRun } = getArquebusModule("src/migrate");
        await migrateRun(config, opts, true);
      } catch (err) {
        exit(err);
      }
    });
    import_commander.program.command("migrate:rollback").description("Rollback the last database migration.").option("--step <number>", "The number of migrations to be reverted.").option("--path <path>", "The path to the migrations directory.").action(async (opts) => {
      if (!configPath) {
        exit("Error: arquebus config not found. Run `arquebus init` first.");
      }
      try {
        const { migrateRollback } = getArquebusModule("src/migrate");
        await migrateRollback(config, opts, true);
      } catch (err) {
        exit(err);
      }
    });
    import_commander.program.command("migrate:status").description("Show the status of each migration.").option("--path <path>", "The path to the migrations directory.").action(async (opts) => {
      if (!configPath) {
        exit("Error: arquebus config not found. Run `arquebus init` first.");
      }
      try {
        const { migrateStatus } = getArquebusModule("src/migrate");
        const migrations = await migrateStatus(config, opts, true);
        if (migrations.length > 0) {
          twoColumnDetail(color2.gray("Migration name"), color2.gray("Batch / Status"));
          migrations.forEach((migration) => {
            const status = migration.ran ? `[${migration.batch}] ${color2.green("Ran")}` : color2.yellow("Pending");
            twoColumnDetail(migration.name, status);
          });
        } else {
          console.log("No migrations found");
        }
      } catch (err) {
        exit(err);
      }
    });
    import_commander.program.command("model:make <name>").description("Create a new Model file.").option("--force", "Force creation if model already exists.", false).action(async (name, opts) => {
      if (!configPath) {
        exit("Error: arquebus config not found. Run `arquebus init` first.");
      }
      try {
        const modelPath = import_path2.default.join(cwd, config?.models?.path || "models", name?.toLowerCase() + ".js");
        if (!opts.force && (0, import_node_fs.statSync)(modelPath).isFile()) {
          exit("Model already exists.");
        }
        (0, import_node_fs.mkdirSync)(import_path2.default.dirname(modelPath), { recursive: true });
        const stubPath = import_path2.default.join(modulePath, "src/stubs/model-js.stub");
        let stub = (0, import_node_fs.readFileSync)(stubPath, "utf-8");
        stub = stub.replace(/{{ name }}/g, name);
        (0, import_node_fs.writeFileSync)(modelPath, stub);
        success(color2.green(`Created Model: ${modelPath}`));
      } catch (err) {
        exit(String(err));
      }
    });
    import_commander.program.parse();
    process.exit(0);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Cli
});

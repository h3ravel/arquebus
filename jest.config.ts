import { createJsWithTsEsmPreset, type JestConfigWithTsJest } from 'ts-jest'

const tsJestTransformCfg = createJsWithTsEsmPreset().transform

const jestConfig: JestConfigWithTsJest = {
  transform: {
    ...tsJestTransformCfg,
  },
  roots: ['<rootDir>'],
  modulePaths: ['.'],
  projects: [
    {
      // Node environment test configuration
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/**/index.test.ts', '<rootDir>/test/**/node.test.ts'],
    },
    {
      // Browser environment test configuration
      displayName: 'browser',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/test/**/browser.test.ts'],
    }
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
}

export default jestConfig 

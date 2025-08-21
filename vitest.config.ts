import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        projects: [
            {
                // Node environment test configuration
                extends: true,
                test: {
                    name: 'node',
                    environment: 'node',
                    root: './test',
                    include: ['{index,node}.test.{ts,js}']
                },
            },
            {
                // Browser environment test configuration
                extends: true,
                test: {
                    name: 'browser',
                    environment: 'jsdom',
                    root: './test',
                    include: ['browser.test.{ts,js}']
                }
            }
        ],
    },
})

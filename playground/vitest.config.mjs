import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@local/transform': fileURLToPath(new URL('../lib', import.meta.url)),
        },
    },
    test: {
        include: ['tests/**/*.test.ts'],
        environmentMatchGlobs: [['tests/runtime.test.ts', 'jsdom']],
    },
});

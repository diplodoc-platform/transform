import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        // Tests are in test/ directory (not tests/)
        include: ['test/**/*.test.ts', 'test/**/*.spec.ts'],
        exclude: ['node_modules', 'lib', 'dist', 'e2e', 'playground'],
        environment: 'node',
        globals: true,
        setupFiles: ['./test/setup/snapshot-serializer.ts'],
        snapshotFormat: {
            escapeString: true,
            printBasicPrototype: false,
        },
        // Configure module resolution to match Jest setup
        moduleNameMapper: {
            '^(\\.{1,2}/.*)\\.js$': '$1',
        },
        // Coverage configuration
        coverage: {
            provider: 'v8',
            include: ['src/**/*'],
            exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'test/**/*'],
        },
    },
});

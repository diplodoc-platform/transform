import {expect} from 'vitest';

// Use jest-serializer-html for consistent HTML formatting
// eslint-disable-next-line @typescript-eslint/no-require-imports
const htmlSerializer = require('jest-serializer-html');

/**
 * Custom snapshot serializer for HTML strings.
 * Uses jest-serializer-html to format HTML snapshots, maintaining compatibility
 * with the format used in Jest tests.
 */
expect.addSnapshotSerializer(htmlSerializer);

import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const resolveFromPlaygroundRoot = (...parts) =>
    resolve(dirname(fileURLToPath(import.meta.url)), '..', ...parts);

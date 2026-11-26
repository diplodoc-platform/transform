import type {DocumentEnv} from './shared-types';

/**
 * Create plain document data; rules and parser services remain caller-owned.
 * @returns Fresh mutable environment, without installed parser rules.
 */
export function createDocumentEnv(): DocumentEnv {
    // Preserve ordinary Transform result keys even when their features are disabled.
    const env: DocumentEnv = {meta: undefined, assets: undefined, headings: [], title: ''};
    Object.defineProperty(env, 'included', {value: {}, writable: true, configurable: true});
    return env;
}

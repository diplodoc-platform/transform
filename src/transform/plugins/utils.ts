import type Token from 'markdown-it/lib/token';
import type {Logger} from '../log';

import {bold} from 'chalk';
import {platform} from 'process';
export type {IDGenerator, IDGeneratorStrategy} from '@diplodoc/utils';
export {createIDGenerator, createIDGeneratorByStrategy} from '@diplodoc/utils';

export type MatchTokenFunction = (
    tokens: Token[],
    idx: number,
) => boolean | null | RegExpMatchArray;

export const nestedCloseTokenIdxFactory =
    (tokenName: string, matchOpenToken: MatchTokenFunction, matchCloseToken: MatchTokenFunction) =>
    (tokens: Token[], idx: number, path: string, log: Logger) => {
        let level = 0;
        let i = idx;
        while (i < tokens.length) {
            if (matchOpenToken(tokens, i)) {
                level++;
            } else if (matchCloseToken(tokens, i)) {
                if (level === 0) {
                    return i;
                }
                level--;
            }

            i++;
        }

        log.error(`${tokenName} must be closed${path ? ` in ${bold(path)}` : ''}`);

        return null;
    };

export const сarriage = platform === 'win32' ? '\r\n' : '\n';

/**
 * Generates a legacy random ID.
 * @deprecated Use `options.generateID` from plugin context instead.
 * Fallback preserves legacy random behavior without shared counter state.
 * @param prefix - Optional prefix to prepend to the generated ID.
 * @returns Random ID string, optionally prefixed with `${prefix}-`.
 */
export function generateID(prefix?: string): string {
    if (!prefix) {
        return Math.random().toString(36).substr(2, 8);
    }

    return `${prefix}-${Math.random().toString(36).substr(2, 8)}`;
}

export function append<T extends Record<string, []>, Key extends keyof T>(
    target: T,
    key: Key,
    ...values: T[Key]
) {
    if (!target[key]) {
        target[key] = values;

        return;
    }

    values.forEach((value) => target[key].push(value));

    return target;
}

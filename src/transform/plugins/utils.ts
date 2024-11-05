import {bold} from 'chalk';
import {platform} from 'process';
import Token from 'markdown-it/lib/token';

import {Logger} from '../log';

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

export function generateID() {
    return Math.random().toString(36).substr(2, 8);
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

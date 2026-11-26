/* eslint-disable no-implicit-globals */
import type {StateCore, Token} from 'markdown-it';
import type {MarkdownItPluginCb, MarkdownItPluginOpts} from '../src/transform/plugins/typings';

import MarkdownIt from 'markdown-it';

import {log} from '../src/transform/log';

type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

const md = new MarkdownIt();

export function callPlugin<T extends {} = {}>(
    plugin: MarkdownItPluginCb<T>,
    tokens: Token[],
    opts?: Partial<MarkdownItPluginOpts & T>,
) {
    md.disable = () => md;
    md.enable = () => md;

    const state = {
        tokens,
        env: {},
        Token: MarkdownIt.Token,
        md,
    } as StateCore;

    const fakeMd = {
        core: {
            ruler: {
                push: (_name: unknown, cb: (s: StateCore) => void) => cb(state),
                before: (_anotherPlugin: unknown, _name: unknown, cb: (s: StateCore) => void) =>
                    cb(state),
            },
        },
    } as InstanceType<typeof MarkdownIt>;

    plugin(
        fakeMd,
        Object.assign(
            {
                path: '',
                log,
                lang: 'ru',
                root: '',
            },
            opts as MarkdownItPluginOpts & T,
        ),
    );

    return state.tokens;
}

export const paragraph = (content: string): DeepPartial<Token>[] => [
    {
        type: 'paragraph_open',
        content: '',
    },
    {
        type: 'inline',
        children: [
            {
                type: 'text',
                tag: '',
                children: null,
                content,
            },
        ],
        content,
    },
    {
        type: 'paragraph_close',
        content: '',
    },
];

export const tokenize = (lines: string[] = []) => md.parse(lines.join('\n'), {});

export * as log from '../src/transform/log';

/**
 * Keep existing diagnostic assertions separate from the two new engine warnings.
 * @param messages - Collected diagnostic strings.
 * @returns Existing diagnostics, excluding only the two named migration codes.
 */
export function withoutBundledEngineWarnings(messages: string[]): string[] {
    return messages.filter(
        (message) =>
            !message.includes('[DEPRECATED TRANSFORM_BUNDLED_LIQUID]') &&
            !message.includes('[DEPRECATED TRANSFORM_BUNDLED_YFMLINT]'),
    );
}

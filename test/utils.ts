/* eslint-disable no-implicit-globals */
import Token from 'markdown-it/lib/token';
import MarkdownIt from 'markdown-it';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import {MarkdownItPluginCb, MarkdownItPluginOpts} from 'src/transform/plugins/typings';
import {log} from '../src/transform/log';

type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

const md = new MarkdownIt();

export function callPlugin<T>(
    plugin: MarkdownItPluginCb<T>,
    tokens: Token[],
    opts?: Partial<MarkdownItPluginOpts & T>,
) {
    md.disable = () => md;
    md.enable = () => md;

    const state = {
        tokens,
        env: {},
        Token,
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
    } as MarkdownIt;

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

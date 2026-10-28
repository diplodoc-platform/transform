import type {Delimiter, Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownIt, StateInline} from '../typings';

import ins from 'markdown-it-ins';

import linkifyStrikethrough from './linkify-strikethrough';

const PLUS_MARKER = 0x2b;
const UNDERLINE_RULE = 'yfm_underline';

type PostprocessInput = {
    tokens: Token[];
    delimiters: Delimiter[];
    tokens_meta: Array<{delimiters: Delimiter[]} | undefined>;
};

function runPostprocessor(postProcess: unknown, input: PostprocessInput) {
    if (typeof postProcess !== 'function') {
        throw new Error('The pinned underline postprocessor must be callable');
    }
    // Private upstream boundary: ins 4.0.0 reads exactly these three fields.
    // Its native StateInline annotation is broader than the implementation needs.
    Reflect.apply(postProcess, undefined, [input]);
}

function collectUnderlineTokens(
    state: StateInline,
    delimiters: Delimiter[],
    ownedDelimiters: WeakSet<Delimiter>,
    tokens: Token[],
) {
    for (const delimiter of delimiters) {
        if (
            delimiter.marker === PLUS_MARKER &&
            delimiter.end !== -1 &&
            ownedDelimiters.has(delimiter) &&
            ownedDelimiters.has(delimiters[delimiter.end])
        ) {
            tokens.push(
                state.tokens[delimiter.token],
                state.tokens[delimiters[delimiter.end].token],
            );
        }
    }
}

function scopedDelimiters(delimiters: Delimiter[], ownedDelimiters: WeakSet<Delimiter>) {
    return delimiters.map((delimiter) => {
        if (
            ownedDelimiters.has(delimiter) &&
            (delimiter.end === -1 || ownedDelimiters.has(delimiters[delimiter.end]))
        ) {
            return delimiter;
        }
        // Keep pair indices intact while hiding foreign delimiters from upstream ins.
        return {...delimiter, marker: 0};
    });
}

// Reuse ++ delimiter parsing while preserving the ordinary emphasis renderers.
export default function underline(md: MarkdownIt) {
    const tokenizerRuler = md.inline.ruler;
    const postprocessorRuler = md.inline.ruler2;
    if (
        [tokenizerRuler, postprocessorRuler].some((ruler) =>
            ruler.__rules__.some((rule) => rule.name === UNDERLINE_RULE),
        )
    ) {
        throw new Error('The underline parser rule name is already installed');
    }

    const previousTokenizers = new Set(tokenizerRuler.__rules__);
    const previousPostprocessors = new Set(postprocessorRuler.__rules__);
    ins(md);
    const tokenizers = tokenizerRuler.__rules__.filter((rule) => !previousTokenizers.has(rule));
    const postprocessors = postprocessorRuler.__rules__.filter(
        (rule) => !previousPostprocessors.has(rule),
    );
    if (
        tokenizers.length !== 1 ||
        postprocessors.length !== 1 ||
        tokenizers[0].name !== 'ins' ||
        postprocessors[0].name !== 'ins' ||
        !tokenizers[0].enabled ||
        !postprocessors[0].enabled ||
        tokenizers[0].alt.length !== 0 ||
        postprocessors[0].alt.length !== 0 ||
        [...previousTokenizers].some((rule) => rule.fn === tokenizers[0].fn) ||
        [...previousPostprocessors].some((rule) => rule.fn === postprocessors[0].fn)
    ) {
        throw new Error('The pinned underline parser must install one tokenizer and postprocessor');
    }
    const [tokenizer] = tokenizers;
    const [postprocessor] = postprocessors;
    const tokenize = tokenizer.fn;
    const postProcess = postprocessor.fn;
    const ownedDelimiters = new WeakSet<Delimiter>();

    // Rename only newly installed rule objects; at() invalidates the normal ruler cache.
    tokenizer.name = UNDERLINE_RULE;
    postprocessor.name = UNDERLINE_RULE;
    tokenizerRuler.at(UNDERLINE_RULE, (state, silent) => {
        const start = state.delimiters.length;
        const result = tokenize(state, silent);
        for (let index = start; index < state.delimiters.length; index++) {
            ownedDelimiters.add(state.delimiters[index]);
        }
        return result;
    });
    postprocessorRuler.at(UNDERLINE_RULE, (state) => {
        // A later upstream ins postprocessor would reinterpret these same delimiters.
        const laterInsTokenizer = tokenizerRuler.__rules__.some(
            (rule) => rule.name === 'ins' && !previousTokenizers.has(rule),
        );
        const laterInsPostprocessor = postprocessorRuler.__rules__.some(
            (rule) => rule.name === 'ins' && rule.enabled && !previousPostprocessors.has(rule),
        );
        if (laterInsTokenizer && laterInsPostprocessor) {
            throw new Error(
                'The ins parser installed after underline conflicts with the ++ grammar; install only one of these plugins',
            );
        }

        // Upstream moves lone + tokens for odd runs. Capture object identities first.
        const tokens: Token[] = [];
        collectUnderlineTokens(state, state.delimiters, ownedDelimiters, tokens);
        for (const meta of state.tokens_meta) {
            if (meta?.delimiters) {
                collectUnderlineTokens(state, meta.delimiters, ownedDelimiters, tokens);
            }
        }

        if (tokens.length === 0) {
            return;
        }

        runPostprocessor(postProcess, {
            tokens: state.tokens,
            delimiters: scopedDelimiters(state.delimiters, ownedDelimiters),
            tokens_meta: state.tokens_meta.map((meta) =>
                meta?.delimiters
                    ? {delimiters: scopedDelimiters(meta.delimiters, ownedDelimiters)}
                    : undefined,
            ),
        });
        for (const token of tokens) {
            // Only the installed parser's paired delimiter tokens are eligible.
            if (token.type === 'ins_open' || token.type === 'ins_close') {
                token.type = token.type === 'ins_open' ? 'underline_open' : 'underline_close';
                token.tag = 'u';
            }
        }
    });

    linkifyStrikethrough(md, {underline: true});
}

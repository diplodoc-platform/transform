import type {Lang, MarkdownItPluginOpts} from '../../shared-types';
import type {Scope} from '../../footnote-data';
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {FootnoteGrammar, FootnoteParser} from './types';

import {createIDGeneratorByStrategy} from '@diplodoc/utils';

import {
    FRAME,
    SOURCE_SCOPE,
    captureDefinitions,
    compileWithService,
    hasFootnotePlan,
    hasFootnoteTokens,
    markFootnoteBody,
    markFootnoteScope,
    requirePlan,
    restore,
    scopeOf,
    sourceScope,
    walk,
} from '../../footnote-data';

import {backLabel} from './labels';

const upstream: (md: FootnoteGrammar) => void = require('markdown-it-footnote');

export type FootnoteOptions = Partial<Pick<MarkdownItPluginOpts, 'generateID'>> & {lang?: Lang};

/**
 * Install reference-only footnotes and finite native output ownership.
 * @param md - Native parser receiving the official grammar and owned renderers.
 * @param options - Optional caller generator and backlink language.
 * @returns Nothing; installs rules and native entry wrappers.
 */
export default function footnotes<Options>(
    md: FootnoteParser<Options>,
    options: FootnoteOptions = {},
) {
    const generateID = options.generateID ?? createIDGeneratorByStrategy('random');
    // The pinned installer is a plain function with no receiver dependence.
    upstream(md);
    md.inline.ruler.disable(['footnote_inline']);
    md.core.ruler.after('footnote_tail', 'yfm_footnote_ownership', (state) => {
        // Upstream inserts a backlink before the final paragraph_close. Remove
        // it before ordinary core rules inspect paragraph triplets (includes).
        // Owned output planning rebuilds exactly the admitted backlinks later.
        state.tokens = state.tokens.filter((token) => token.type !== 'footnote_anchor');
        const scope = Reflect.get(state.env, FRAME) as Scope;
        if (!state.inlineMode) scope.admittedLabels = new Set();
        let insideBody = false;
        for (const token of state.tokens) {
            if (token.type === 'footnote_block_open') insideBody = true;
            if (insideBody) markFootnoteBody([token]);
            walk([token], (child) => {
                if (child.type.startsWith('footnote_') && !scopeOf(child)) {
                    markFootnoteScope(child, scope);
                }
            });
            if (
                !state.inlineMode &&
                token.type === 'footnote_open' &&
                scopeOf(token) === scope &&
                typeof token.meta?.label === 'string'
            ) {
                scope.admittedLabels?.add(token.meta.label);
            }
            if (token.type === 'footnote_block_close') insideBody = false;
        }
    });
    const parse = md.parse;
    md.parse = function (source, env = {}) {
        const previousFootnotes = Object.getOwnPropertyDescriptor(env, 'footnotes');
        const previousFrame = Object.getOwnPropertyDescriptor(env, FRAME);
        const scope: Scope = {definitions: new Map()};
        try {
            Object.defineProperty(env, FRAME, {value: scope, configurable: true});
            Object.defineProperty(env, 'footnotes', {
                value: {},
                writable: true,
                enumerable: true,
                configurable: true,
            });
            const tokens = parse.call(this, source, env);
            if (!hasFootnoteTokens(tokens)) return tokens;
            captureDefinitions(tokens, scope);
            scope.rawOutput = {rootScope: scope, generateID};
            Object.defineProperty(tokens, SOURCE_SCOPE, {value: scope});
            return tokens;
        } finally {
            restore(env, 'footnotes', previousFootnotes);
            restore(env, FRAME, previousFrame);
        }
    };
    {
        const parseInline = md.parseInline;
        md.parseInline = function (source, env = {}) {
            const scope = Reflect.get(env, FRAME) as Scope | undefined;
            if (scope && !scope.admittedLabels) return parseInline.call(this, source, env);
            const previous = Object.getOwnPropertyDescriptor(env, 'footnotes');
            // A late inline-only title cannot admit a previously unused body.
            // Existing bodies remain available without reparsing or replacing counts.
            const upstreamState = scope ? env.footnotes : undefined;
            let local: object = {};
            if (
                scope &&
                upstreamState &&
                typeof upstreamState === 'object' &&
                'refs' in upstreamState &&
                upstreamState.refs &&
                typeof upstreamState.refs === 'object'
            ) {
                local = {
                    ...upstreamState,
                    refs: Object.fromEntries(
                        Object.entries(upstreamState.refs).filter(([label]) =>
                            scope.admittedLabels?.has(label.slice(1)),
                        ),
                    ),
                };
            }
            try {
                Object.defineProperty(env, 'footnotes', {
                    value: local,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
                return parseInline.call(this, source, env);
            } finally {
                restore(env, 'footnotes', previous);
            }
        };
        const render = md.renderer.render;
        let rendering = false;
        md.renderer.render = function (tokens, renderOptions, env = {}) {
            if (rendering) return render.call(this, tokens, renderOptions, env);
            const service = sourceScope(tokens)?.rawOutput;
            if (!service) {
                let hasUnplannedReferences = false;
                walk(tokens, (token) => {
                    if (token.type === 'footnote_ref' && !hasFootnotePlan(token))
                        hasUnplannedReferences = true;
                });
                if (hasUnplannedReferences)
                    throw new Error(
                        'Raw footnote output needs the original parsed token array; materialize into an owned root array',
                    );
                return render.call(this, tokens, renderOptions, env);
            }
            rendering = true;
            try {
                return compileWithService(
                    md,
                    env,
                    tokens,
                    (prepared) => render.call(this, prepared, renderOptions, env),
                    service,
                );
            } finally {
                rendering = false;
            }
        };
    }
    // Renderers consume a precomputed plan, never generate or mutate IDs.
    md.renderer.rules.footnote_ref = (tokens: Token[], index: number) => {
        const ids = requirePlan(tokens[index]);
        return `<sup class="footnote-ref"><a href="#${ids.body}" id="${ids.ref}">[${ids.caption}]</a></sup>`;
    };
    md.renderer.rules.footnote_open = (tokens: Token[], index: number) =>
        `<li id="${requirePlan(tokens[index]).body}" class="footnote-item">`;
    md.renderer.rules.footnote_anchor = (tokens: Token[], index: number) => {
        const ids = requirePlan(tokens[index]);
        return ` <a href="#${ids.ref}" class="footnote-backref">${backLabel(options.lang ?? 'ru', ids.caption, ids.reference)}</a>`;
    };
}

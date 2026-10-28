import type {Lang, MarkdownIt, MarkdownItPluginOpts} from '../../shared-types';
import type {Scope} from '../../footnote-data';

import upstream from 'markdown-it-footnote';
import {createIDGeneratorByStrategy} from '@diplodoc/utils';

import {
    FRAME,
    SOURCE_SCOPE,
    captureDefinitions,
    compileWithService,
    requirePlan,
    restore,
    sourceScope,
    walk,
} from '../../footnote-data';

import {backLabel} from './labels';

export type FootnoteOptions = Partial<Pick<MarkdownItPluginOpts, 'generateID'>> & {lang?: Lang};

/**
 * Install reference-only footnotes and finite native output ownership.
 * @param md - Native parser receiving the official grammar and owned renderers.
 * @param options - Optional caller generator and backlink language.
 * @returns Nothing; installs rules and native entry wrappers.
 */
export default function footnotes(md: MarkdownIt, options: FootnoteOptions = {}) {
    const generateID = options.generateID ?? createIDGeneratorByStrategy('random');
    md.use(upstream);
    md.inline.ruler.disable(['footnote_inline']);
    md.core.ruler.after('footnote_tail', 'yfm_footnote_ownership', (state) => {
        // Upstream inserts a backlink before the final paragraph_close. Remove
        // it before ordinary core rules inspect paragraph triplets (includes).
        // Owned output planning rebuilds exactly the admitted backlinks later.
        state.tokens = state.tokens.filter((token) => token.type !== 'footnote_anchor');
        const scope = Reflect.get(state.env, FRAME) as Scope;
        let insideBody = false;
        for (const token of state.tokens) {
            if (token.type === 'footnote_block_open') insideBody = true;
            const isBody = insideBody;
            walk([token], (child) => {
                if (isBody) child.meta = {...child.meta, footnoteBody: true};
                if (child.type.startsWith('footnote_')) {
                    child.meta = {...child.meta, footnoteScope: scope};
                }
            });
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
            if (Reflect.get(env, FRAME)) return parseInline.call(this, source, env);
            const previous = Object.getOwnPropertyDescriptor(env, 'footnotes');
            try {
                Object.defineProperty(env, 'footnotes', {
                    value: {},
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
                    if (token.type === 'footnote_ref' && !token.meta?.footnotePlan)
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
    md.renderer.rules.footnote_ref = (tokens, index) => {
        const ids = requirePlan(tokens[index]);
        return `<sup class="footnote-ref"><a href="#${ids.body}" id="${ids.ref}">[${ids.caption}]</a></sup>`;
    };
    md.renderer.rules.footnote_open = (tokens, index) =>
        `<li id="${requirePlan(tokens[index]).body}" class="footnote-item">`;
    md.renderer.rules.footnote_anchor = (tokens, index) => {
        const ids = requirePlan(tokens[index]);
        return ` <a href="#${ids.ref}" class="footnote-backref">${backLabel(options.lang ?? 'ru', ids.caption, ids.reference)}</a>`;
    };
}

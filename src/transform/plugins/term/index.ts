import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';
import type Token from 'markdown-it/lib/token';
import type {MarkdownItPluginCb} from '../typings';
import type {IDGenerator} from '../utils';

import {generateID as globalGenerateID} from '../utils';

import {termDefinitions} from './termDefinitions';
import {BASIC_TERM_REGEXP} from './constants';

function setTermAttrs(token: Token, termKey: string, generateID: IDGenerator): void {
    token.attrSet('class', 'yfm yfm-term_title');
    token.attrSet('term-key', ':' + termKey);
    token.attrSet('role', 'button');
    token.attrSet('aria-controls', ':' + termKey + '_element');
    token.attrSet('tabindex', '0');
    token.attrSet('id', generateID(termKey));
}

interface TermMatch {
    labelEnd: number;
    termId: string;
    endPos: number;
}

/**
 * Scans src for [text](*termId) starting at `start`.
 *
 * @param src - source string
 * @param start - position of the opening `[`
 * @param max - maximum position to scan
 * @returns match info or null
 */
function matchTermPattern(src: string, start: number, max: number): TermMatch | null {
    // Scan for closing ] (no nested [ allowed, matching the original regex)
    let pos = start + 1;
    while (
        pos <= max &&
        src.charCodeAt(pos) !== 0x5d /* ] */ &&
        src.charCodeAt(pos) !== 0x5b /* [ */
    ) {
        if (src.charCodeAt(pos) === 0x5c /* \ */) {
            pos++;
        }
        pos++;
    }

    if (pos > max || src.charCodeAt(pos) !== 0x5d /* ] */) {
        return null;
    }

    const labelEnd = pos;
    if (labelEnd === start + 1) {
        return null;
    }

    // Expect (*
    pos = labelEnd + 1;
    if (
        pos + 1 > max ||
        src.charCodeAt(pos) !== 0x28 /* ( */ ||
        src.charCodeAt(pos + 1) !== 0x2a /* * */
    ) {
        return null;
    }
    pos += 2;

    // Read term id until )
    const termIdStart = pos;
    while (
        pos <= max &&
        src.charCodeAt(pos) !== 0x29 /* ) */ &&
        src.charCodeAt(pos) !== 0x0a /* \n */
    ) {
        pos++;
    }

    if (pos > max || src.charCodeAt(pos) !== 0x29 /* ) */) {
        return null;
    }

    const termId = src.slice(termIdStart, pos);
    if (!termId) {
        return null;
    }

    return {labelEnd, termId, endPos: pos + 1};
}

/**
 * Creates an inline rule that matches [text](*termId) for defined terms.
 * Runs before the link rule so that * characters inside the
 * pattern are consumed and never trigger emphasis.
 *
 * @param generateID - per-file isolated ID generator
 * @returns inline rule function for markdown-it
 */
function termInlineRuleFactory(generateID: IDGenerator) {
    return function termInlineRule(state: StateInline, silent: boolean): boolean {
        if (state.src.charCodeAt(state.pos) !== 0x5b /* [ */ || !state.env.terms) {
            return false;
        }

        const match = matchTermPattern(state.src, state.pos, state.posMax);
        if (!match || !state.env.terms[':' + match.termId]) {
            return false;
        }

        if (!silent) {
            const labelContent = state.src
                .slice(state.pos + 1, match.labelEnd)
                .replace(/\\(.)/g, '$1');

            const termOpen = state.push('term_open', 'i', 1);
            setTermAttrs(termOpen, match.termId, generateID);

            const textToken = state.push('text', '', 0);
            textToken.content = labelContent;

            state.push('term_close', 'i', -1);
        }

        state.pos = match.endPos;
        return true;
    };
}

const RAW_CODE_TOKEN_TYPES = new Set(['fence', 'code_block', 'yfm_page-constructor']);

function collectRawTermMatches(content: string, reg: RegExp, out: Set<string>) {
    reg.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = reg.exec(content))) {
        out.add(':' + match[3]);
    }
}

function collectTermsFromRawContent(tokens: Token[], reg: RegExp, out: Set<string>) {
    for (const token of tokens) {
        if (RAW_CODE_TOKEN_TYPES.has(token.type) && token.content) {
            collectRawTermMatches(token.content, reg, out);
        }

        if (token.type === 'inline') {
            // Scan the raw inline content to catch term references that
            // may have been split across child tokens by emphasis parsing.
            // When term definitions come from includes resolved after inline
            // parsing, term_inline fails and `(*key)` gets fragmented by
            // the `*` emphasis delimiter — making per-child scanning miss them.
            if (token.content) {
                collectRawTermMatches(token.content, reg, out);
            }

            if (token.children) {
                for (const child of token.children) {
                    if (child.type === 'code_inline' && child.content) {
                        collectRawTermMatches(child.content, reg, out);
                    }
                }
            }
        }
    }
}

function collectTermKeysFromInlineChildren(children: Token[], out: Set<string>) {
    for (const child of children) {
        if (child.type === 'term_open') {
            const key = child.attrGet('term-key');

            if (key) {
                out.add(key);
            }
        }
    }
}

function collectTermsFromContent(tokens: Token[], out: Set<string>) {
    let inDfn = false;

    for (const token of tokens) {
        if (token.type === 'dfn_open') {
            inDfn = true;
            continue;
        }

        if (token.type === 'dfn_close') {
            inDfn = false;
            continue;
        }

        if (!inDfn && token.type === 'inline' && token.children) {
            collectTermKeysFromInlineChildren(token.children, out);
        }
    }
}

function collectTermsFromDfns(tokens: Token[], out: Set<string>, referencedDfns: Set<string>) {
    let inReferencedDfn = false;

    for (const token of tokens) {
        if (token.type === 'dfn_open') {
            const key = (token.attrGet('id') || '').replace(/_element$/, '');

            inReferencedDfn = Boolean(key) && referencedDfns.has(key);
            continue;
        }

        if (token.type === 'dfn_close') {
            inReferencedDfn = false;
            continue;
        }

        if (inReferencedDfn && token.type === 'inline' && token.children) {
            collectTermKeysFromInlineChildren(token.children, out);
        }
    }
}

function findDfnCloseIdx(tokens: Token[], from: number) {
    let endIdx = from;

    while (endIdx < tokens.length && tokens[endIdx].type !== 'dfn_close') {
        endIdx++;
    }

    return endIdx;
}

function removeUnreferencedDefinitions(tokens: Token[], referencedTerms: Set<string>) {
    let idx = 0;

    while (idx < tokens.length) {
        const tok = tokens[idx];

        if (tok.type === 'dfn_open') {
            const termKey = (tok.attrGet('id') || '').replace(/_element$/, '');

            if (termKey && !referencedTerms.has(termKey)) {
                const endIdx = findDfnCloseIdx(tokens, idx + 1);

                if (endIdx < tokens.length) {
                    tokens.splice(idx, endIdx - idx + 1);
                    continue;
                }
            }
        }

        idx++;
    }
}

const term: MarkdownItPluginCb = (md, options) => {
    const escapeRE = md.utils.escapeRE;
    const arrayReplaceAt = md.utils.arrayReplaceAt;

    const {isLintRun} = options;
    const generateID = options.generateID ?? globalGenerateID;

    // Prevent * URLs from being parsed as regular links (backward compatibility)
    const defaultLinkValidation = md.validateLink;
    md.validateLink = function (url) {
        if (url.startsWith('*')) {
            return false;
        }

        return defaultLinkValidation(url);
    };

    // Inline rule: handles [text](*termId) before emphasis can interfere with *
    md.inline.ruler.before('link', 'term_inline', termInlineRuleFactory(generateID));

    function termReplace(state: StateCore) {
        let i, j, l, tokens, token, text, nodes, pos, termMatch, currentToken;

        const blockTokens = state.tokens;

        if (!state.env.terms) {
            return;
        }

        const termKeys = Object.keys(state.env.terms);

        if (!termKeys.length) {
            return;
        }

        const referencedTerms = new Set<string>();

        const regTerms = termKeys
            .map((el) => el.slice(1))
            .map(escapeRE)
            .join('|');
        const regText = '\\[([^\\[]+)\\](\\(\\*(' + regTerms + ')\\))';
        const reg = new RegExp(regText, 'g');

        collectTermsFromRawContent(blockTokens, reg, referencedTerms);
        collectTermsFromContent(blockTokens, referencedTerms);

        // Collect terms transitively referenced inside definitions of referenced terms.
        collectTermsFromDfns(blockTokens, referencedTerms, referencedTerms);

        for (j = 0, l = blockTokens.length; j < l; j++) {
            if (blockTokens[j].type === 'heading_open') {
                while (blockTokens[j].type !== 'heading_close') {
                    j++;
                }
                continue;
            }

            if (blockTokens[j].type !== 'inline') {
                continue;
            }

            tokens = blockTokens[j].children as Token[];

            for (i = tokens.length - 1; i >= 0; i--) {
                currentToken = tokens[i];
                if (currentToken.type === 'link_close') {
                    while (tokens[i].type !== 'link_open') {
                        i--;
                    }
                    continue;
                }

                if (currentToken.type !== 'text') {
                    continue;
                }

                pos = 0;
                text = currentToken.content;
                reg.lastIndex = 0;
                nodes = [];

                // Find terms without definitions
                const regexAllTerms = new RegExp(BASIC_TERM_REGEXP, 'gm');
                const uniqueTerms = [
                    ...new Set([...text.matchAll(regexAllTerms)].map((el) => `:${el[3]}`)),
                ];
                const notDefinedTerms = uniqueTerms.filter(
                    (el) => !Object.keys(state.env.terms).includes(el),
                );

                if (notDefinedTerms.length && isLintRun) {
                    token = new state.Token('__yfm_lint', '', 0);
                    token.hidden = true;
                    token.map = blockTokens[j].map;
                    token.attrSet('YFM007', 'true');
                    nodes.push(token);
                }

                while ((termMatch = reg.exec(text))) {
                    const termTitle = termMatch[1];
                    const termKey = termMatch[3];

                    referencedTerms.add(':' + termKey);

                    if (termMatch.index > 0 || termMatch[1].length > 0) {
                        token = new state.Token('text', '', 0);
                        token.content = text.slice(pos, termMatch.index);
                        nodes.push(token);
                    }

                    token = new state.Token('term_open', 'i', 1);
                    setTermAttrs(token, termKey, generateID);
                    nodes.push(token);

                    token = new state.Token('text', '', 0);
                    token.content = termTitle;
                    nodes.push(token);

                    token = new state.Token('term_close', 'i', -1);
                    nodes.push(token);

                    pos = reg.lastIndex;
                }

                if (!nodes.length) {
                    continue;
                }

                if (pos < text.length) {
                    token = new state.Token('text', '', 0);
                    token.content = text.slice(pos);
                    nodes.push(token);
                }

                // replace current node
                blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes);
            }
        }

        // Remove definitions without any reference on the page
        // Skip during linting to allow lint rules to check term definitions
        if (!isLintRun) {
            removeUnreferencedDefinitions(state.tokens, referencedTerms);
        }
    }

    md.block.ruler.before('reference', 'termDefinitions', termDefinitions(md, options), {
        alt: ['paragraph', 'reference'],
    });

    // Register termReplace after text_join so that emphasis-split text
    // tokens (e.g. [text](*key) where * opens a delimiter) are merged
    // before the term regex runs.  Without this, terms defined in
    // included files (resolved after inline parsing) would be missed.
    try {
        md.core.ruler.after('text_join', 'termReplace', termReplace);
    } catch {
        md.core.ruler.after('linkify', 'termReplace', termReplace);
    }
};

export = term;

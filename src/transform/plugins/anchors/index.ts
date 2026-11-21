import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type Token from 'markdown-it/lib/token';
import type {MarkdownItPluginCb} from '../typings';

import {bold} from 'chalk';
import GithubSlugger from 'github-slugger';
import slugify from 'slugify';

import {headingInfo} from '../../utils';

import {ANCHOR_TITLES} from './constants';
import {
    getCustomIds,
    getHeadingAttributeSuffix,
    hasEmptyShorthandId,
    removeCustomIds,
    trimHeadingWhitespace,
} from './custom-id';

function createAnchorButtonTokens(
    state: StateCore,
    id: string,
    setId = false,
    href: string,
    title: string,
) {
    const open = new state.Token('anchor_open', 'button', 1);
    const close = new state.Token('anchor_close', 'button', -1);

    if (setId) {
        open.attrSet('id', id);
    }

    open.attrSet('class', 'yfm-clipboard-anchor');
    open.attrSet('data-href', href + '#' + id);
    open.attrSet('aria-label', title);
    open.attrSet('title', title);

    return [open, close];
}

function createAnchorLinkTokens(
    state: StateCore,
    id: string,
    setId = false,
    href: string,
    title: string,
) {
    const open = new state.Token('link_open', 'a', 1);
    const close = new state.Token('link_close', 'a', -1);

    if (setId) {
        open.attrSet('id', id);
    }
    open.attrSet('href', href + '#' + id);
    open.attrSet('class', 'yfm-anchor yfm-clipboard-anchor');
    open.attrSet('aria-hidden', 'true');

    // SEO: render invisible heading title because link must have text content.
    const hiddenDesc = new state.Token('anchor_hidden_desc', '', 0);

    hiddenDesc.content = title;

    return [open, hiddenDesc, close];
}

interface Options {
    leftDelimiter?: string;
    rightDelimiter?: string;
    extractTitle?: boolean;
    supportGithubAnchors?: boolean;
    disableCommonAnchors?: boolean;
    useCommonAnchorButtons?: boolean;
    transformLink: (v: string) => string;
    getPublicPath?: (options: Options, v?: string) => string;
}

const index: MarkdownItPluginCb<Options> = (md, options) => {
    const {
        extractTitle,
        path,
        log,
        supportGithubAnchors,
        getPublicPath,
        disableCommonAnchors,
        useCommonAnchorButtons,
        lang,
        isLintRun,
    } = options;

    const customIdsBeforeAttrs = new WeakMap<Token, string[] | null>();
    const prepareHeadingCustomIds = (state: StateCore) => {
        state.tokens.forEach((token, tokenIndex) => {
            if (token.type !== 'heading_open') {
                return;
            }

            const inlineToken = state.tokens[tokenIndex + 1];
            const prepared = customIdsBeforeAttrs.has(token);
            let customIds = customIdsBeforeAttrs.get(token);
            if (!prepared) {
                customIds = getCustomIds(inlineToken);
                customIdsBeforeAttrs.set(token, customIds);
                if (customIds) {
                    token.attrSet('id', customIds[0]);
                    removeCustomIds(inlineToken);
                }
            }
            protectLiteralHeadingAttributes(
                state,
                inlineToken,
                !prepared && !customIds,
                options.leftDelimiter,
                options.rightDelimiter,
            );
        });
    };
    const consumeCustomIds = (token: Token, inlineToken: Token) => {
        if (customIdsBeforeAttrs.has(token)) {
            return customIdsBeforeAttrs.get(token);
        }

        const customIds = getCustomIds(inlineToken);
        if (customIds) {
            removeCustomIds(inlineToken);
        }
        return customIds;
    };

    const titlesBeforeAttrs = new WeakMap<Token, string>();
    const captureHeadingTitles = (state: StateCore) => {
        state.tokens.forEach((token, tokenIndex) => {
            if (token.type === 'heading_open') {
                titlesBeforeAttrs.set(token, headingInfo(state.tokens, tokenIndex).title);
            }
        });
    };
    const markEmptyShorthandIds = (state: StateCore) => {
        state.tokens.forEach((token, tokenIndex) => {
            if (token.type !== 'heading_open') {
                return;
            }
            const children = state.tokens[tokenIndex + 1].children;
            const last = children?.[children.length - 1];
            if (
                last?.type === 'text' &&
                hasEmptyShorthandId(last.content, options.leftDelimiter, options.rightDelimiter)
            ) {
                token.attrSet('YFM024', 'true');
            }
        });
    };
    const getSlugTitle = (token: Token, visibleTitle: string) => {
        if (token.attrGet('id')) {
            return visibleTitle;
        }
        return titlesBeforeAttrs.get(token) ?? visibleTitle;
    };

    const plugin = (state: StateCore) => {
        /* Do not use the plugin if it is included in the file */
        if (state.env.includes && state.env.includes.length) {
            return;
        }

        const href = getPublicPath ? getPublicPath(options, state.env.path) : '';

        const ids: Record<string, number> = {};
        const tokens = state.tokens;
        let i = 0;
        const slugger = new GithubSlugger();

        const createAnchorTokens = useCommonAnchorButtons
            ? createAnchorButtonTokens
            : createAnchorLinkTokens;

        while (i < tokens.length) {
            const token = tokens[i];
            const isHeading = token.type === 'heading_open';

            if (isHeading) {
                trimHeadingWhitespace(tokens[i + 1]);
                const {title, level} = headingInfo(tokens, i);

                const inlineToken = tokens[i + 1];
                const customIds = consumeCustomIds(token, inlineToken);
                let id = token.attrGet('id');
                let ghId: string;

                if (!title) {
                    log.warn(`Header without title${path ? ` in ${bold(path)}` : ''}`);
                }

                if (level < 2 && extractTitle) {
                    if (customIds) {
                        setHeadingId(token, customIds[0]);
                    }
                    i += 3;
                    continue;
                }

                if (customIds) {
                    id = customIds[0];
                } else {
                    // Preserve existing automatic URLs when includes ran before attributes.
                    const slugTitle = getSlugTitle(token, title);
                    id ||= slugify(slugTitle, {
                        lower: true,
                        remove: /[^\w\s$_\-,;=/]+/g,
                    });
                    if (isLintRun && !id) {
                        token.attrSet('YFM021', 'true');
                    }
                    ghId = slugger.slug(slugTitle);
                }

                setHeadingId(token, id);

                if (ids[id]) {
                    id = id + ids[id]++;
                    token.attrSet('id', id);
                } else {
                    ids[id] = 1;
                }

                const allAnchorIds = customIds ? customIds : [id];
                const anchorTitle = useCommonAnchorButtons
                    ? ANCHOR_TITLES[lang]
                    : getAnchorTitle(inlineToken);

                allAnchorIds.forEach((customId) => {
                    const setId = id !== customId;
                    if (!disableCommonAnchors) {
                        const linkTokens = createAnchorTokens(
                            state,
                            customId,
                            setId,
                            href,
                            anchorTitle,
                        );
                        inlineToken.children?.unshift(...linkTokens);
                    }

                    if (supportGithubAnchors) {
                        const ghLinkTokens = createAnchorTokens(
                            state,
                            ghId,
                            true,
                            href,
                            anchorTitle,
                        );
                        inlineToken.children?.unshift(...ghLinkTokens);
                    }
                });

                i += 3;
                continue;
            }

            i++;
        }
    };

    const insertOptionalRule = (
        position: 'before' | 'after',
        reference: string,
        ruleName: string,
        rule: (state: StateCore) => void,
    ) => {
        try {
            md.core.ruler[position](reference, ruleName, rule);
            return true;
        } catch {
            // Optional plugins need not register the reference rule.
            return false;
        }
    };

    const hasAttributes = insertOptionalRule('after', 'curly_attributes', 'anchors', plugin);
    if (hasAttributes) {
        md.core.ruler.before(
            'curly_attributes',
            'prepare_heading_custom_ids',
            prepareHeadingCustomIds,
        );
        insertOptionalRule('after', 'includes', 'capture_heading_titles', captureHeadingTitles);
    } else if (!insertOptionalRule('after', 'includes', 'anchors', plugin)) {
        md.core.ruler.push('anchors', plugin);
    }
    if (isLintRun && hasAttributes) {
        insertOptionalRule(
            'before',
            'curly_attributes',
            'lint_custom_heading_ids',
            markEmptyShorthandIds,
        );
    }

    const {escapeHtml} = md.utils;

    md.renderer.rules.anchor_hidden_desc = function (tokens, tokenIndex) {
        return (
            '<span class="visually-hidden" data-no-index="true">' +
            escapeHtml(tokens[tokenIndex].content) +
            '</span>'
        );
    };
};

export = index;

function setHeadingId(token: Token, id: string) {
    token.attrs = token.attrs?.filter(([name]) => name !== 'id') || null;
    token.attrSet('id', id);
}

function getAnchorTitle(token: Token) {
    return (token.children || [])
        .filter((child) => ['text', 'text_special', 'code_inline'].includes(child.type))
        .map((child) => child.content)
        .join('')
        .trim();
}

function protectLiteralHeadingAttributes(
    state: StateCore,
    token: Token,
    allowAttributes: boolean,
    left = '{',
    right = '}',
) {
    const suffix = allowAttributes ? getHeadingAttributeSuffix(token, left, right) : undefined;
    token.children =
        token.children?.flatMap((child, index) => {
            if (child.type !== 'text') {
                return [child];
            }

            const tokens: Token[] = [];
            const end = suffix?.index === index ? suffix.match.index : child.content.length;
            let start = 0;
            for (
                let delimiter = child.content.indexOf(left);
                delimiter >= 0 && delimiter < end;
                delimiter = child.content.indexOf(left, start)
            ) {
                if (delimiter > start) {
                    const text = new state.Token('text', '', 0);
                    text.content = child.content.slice(start, delimiter);
                    text.level = child.level;
                    tokens.push(text);
                }

                // text_join restores this delimiter after markdown-it-attrs runs.
                const literal = new state.Token('text_special', '', 0);
                literal.content = left;
                literal.level = child.level;
                tokens.push(literal);
                start = delimiter + left.length;
            }

            child.content = child.content.slice(start);
            tokens.push(child);
            return tokens;
        }) || null;
}

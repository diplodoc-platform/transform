import {MarkdownItPluginCb} from './typings';
import Core from 'markdown-it/lib/parser_core';
import Token from 'markdown-it/lib/token';
import {bold} from 'chalk';
import yaml from 'js-yaml';
import StateCore from 'markdown-it/lib/rules_core/state_core';

interface Metadata {
    date: string;
}

const CHANGELOG_OPEN_RE = /^\{% changelog %}/;
const CHANGELOG_CLOSE_RE = /^\{% endChangelog %}/;

function isOpenToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 2].type === 'paragraph_close' &&
        CHANGELOG_OPEN_RE.test(tokens[i + 1].content)
    );
}

function isCloseToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 2].type === 'paragraph_close' &&
        CHANGELOG_CLOSE_RE.test(tokens[i + 1].content)
    );
}

function isTitle(tokens: Token[], i = 0) {
    return (
        tokens[i].type === 'heading_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 2].type === 'heading_close'
    );
}

function isImageParagraph(tokens: Token[], i = 0) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 2].type === 'paragraph_close' &&
        tokens[i + 1].children?.some((t) => t.type === 'image')
    );
}

function parseBody(tokens: Token[], state: StateCore) {
    const {md, env} = state;

    const metadataToken = tokens.shift();
    if (metadataToken?.type !== 'fence') {
        throw new Error('Metadata tag not found');
    }
    const rawMetadata = yaml.load(metadataToken.content) as Metadata;
    const metadata = {
        ...rawMetadata,
        date: new Date(rawMetadata.date).toISOString(),
    };

    if (!isTitle(tokens)) {
        throw new Error('Title tag not found');
    }
    const title = tokens.splice(0, 3)[1].content;

    let image;
    if (isImageParagraph(tokens)) {
        const paragraphTokens = tokens.splice(0, 3);
        const imageToken = paragraphTokens[1]?.children?.find((token) => token.type === 'image');
        if (imageToken) {
            const width = Number(imageToken.attrGet('width'));
            const height = Number(imageToken.attrGet('height'));
            let ratio;
            if (Number.isFinite(width) && Number.isFinite(height)) {
                ratio = height / width;
            }
            let alt = imageToken.attrGet('title') || '';
            if (!alt && imageToken.children) {
                alt = md.renderer.renderInlineAsText(imageToken.children, md.options, env);
            }
            image = {
                src: imageToken.attrGet('src'),
                alt,
                ratio,
            };
        }
    }

    const description = md.renderer.render(tokens, md.options, env);

    return {
        ...metadata,
        title,
        image,
        description,
    };
}

const changelog: MarkdownItPluginCb = function (md, {log, path}) {
    const plugin: Core.RuleCore = (state) => {
        const {tokens, env} = state;

        for (let i = 0, len = tokens.length; i < len; i++) {
            const isOpen = isOpenToken(tokens, i);
            if (!isOpen) continue;

            const openAt = i;
            let isCloseFound = false;
            while (i < len) {
                i++;
                if (isCloseToken(tokens, i)) {
                    isCloseFound = true;
                    break;
                }
            }

            if (!isCloseFound) {
                log.error(`Changelog close tag in not found: ${bold(path)}`);
                break;
            }

            const closeAt = i + 2;
            const content = tokens.slice(openAt, closeAt + 1);

            // cut open
            content.splice(0, 3);
            // cut close
            content.splice(-3);

            try {
                const change = parseBody(content, state);

                if (!env?.changelog) {
                    env.changelog = [];
                }

                env.changelog.push(change);
            } catch (err) {
                log.error(`Changelog error: ${(err as Error).message} in ${bold(path)}`);
                continue;
            }

            tokens.splice(openAt, closeAt + 1 - openAt);
            len = tokens.length;
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'changelog', plugin);
    } catch (e) {
        md.core.ruler.push('changelog', plugin);
    }
};

export = changelog;

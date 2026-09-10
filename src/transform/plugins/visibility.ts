import type MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block';
import type {ContainerDirectiveParams} from '@diplodoc/directive';
import type {MarkdownItPluginCb} from './typings';

import MarkdownItImpl from 'markdown-it';
import {
    directiveParser,
    registerContainerDirective,
    tokenizeBlockContent,
} from '@diplodoc/directive';

export type ContentAudience = 'human' | 'agent';
export type VisibilityMode = ContentAudience | 'preserve';

export interface VisibilityError {
    line: number;
    value: string;
    message: string;
}

export interface VisibilityOptions {
    audience?: VisibilityMode;
    lint?: boolean;
    onError?: (error: VisibilityError) => void;
}

export interface AudienceFilterResult {
    content: string;
    audience: ContentAudience[];
    originalCharacters: number;
    filteredCharacters: number;
    removedCharacters: number;
    errors: VisibilityError[];
}

type VisibilityMeta = Record<string, unknown> & {
    visibilityAudiences?: ContentAudience[];
};

type VisibilityBlock = {
    audience?: ContentAudience;
    params: ContainerDirectiveParams;
    children: VisibilityBlock[];
};

const AUDIENCE_ORDER: ContentAudience[] = ['human', 'agent'];

function parseAudience(value = ''): ContentAudience | undefined {
    return AUDIENCE_ORDER.find((audience) => audience === value);
}

function createVisibilityError(value: string, line: number): VisibilityError {
    const printableValue = value || '<empty>';
    return {
        line,
        value,
        message: `Invalid visibility audience "${printableValue}" at line ${line}; expected "human" or "agent"`,
    };
}

function addAudience(target: Set<ContentAudience>, audience: ContentAudience): void {
    target.add(audience);
}

function orderedAudiences(audiences: Iterable<ContentAudience>): ContentAudience[] {
    const values = new Set(audiences);
    return AUDIENCE_ORDER.filter((audience) => values.has(audience));
}

function markAudience(state: StateBlock, audience: ContentAudience): void {
    if (!state.env.meta || typeof state.env.meta !== 'object' || Array.isArray(state.env.meta)) {
        state.env.meta = {};
    }
    const meta = state.env.meta as VisibilityMeta;
    meta.visibilityAudiences = orderedAudiences([...(meta.visibilityAudiences ?? []), audience]);
}

function emitLintToken(
    state: StateBlock,
    params: ContainerDirectiveParams,
    audience: ContentAudience | undefined,
): void {
    const token = state.push('__yfm_lint', '', 0);
    token.hidden = true;
    token.map = [params.startLine, params.startLine + 1];
    token.attrSet('visibility-directive', 'true');
    token.attrSet('visibility-audience', params.contentTitle?.raw ?? '');
    token.attrSet('YFM023', audience ? 'valid' : 'invalid');
}

/**
 * Creates the audience visibility directive plugin.
 *
 * The `preserve` mode tokenizes both audiences without rendering the directive wrapper. It is
 * intended for source-aware consumers such as the translation pipeline, which retain untouched
 * source ranges around the emitted content tokens.
 *
 * @returns Markdown-it plugin for audience visibility blocks.
 */
export function visibility({
    audience = 'human',
    lint = false,
    onError,
}: VisibilityOptions = {}): MarkdownIt.PluginSimple {
    return (md) => {
        md.use(directiveParser());
        if (lint) {
            md.core.ruler.before('block', 'visibility-lint-mode', (state) => {
                const token = new state.Token('__yfm_lint', '', 0);
                token.hidden = true;
                token.attrSet('visibility-parser', 'true');
                state.tokens.push(token);
            });
        }
        registerContainerDirective(md, 'visibility', (state, params) => {
            const rawAudience = params.contentTitle?.raw ?? '';
            const blockAudience = parseAudience(rawAudience);

            if (lint) {
                emitLintToken(state, params, blockAudience);
            }

            if (!blockAudience) {
                onError?.(createVisibilityError(rawAudience, params.startLine + 1));
                if (audience === 'preserve') {
                    tokenizeBlockContent(state, params.content, 'visibility-directive');
                }
                return true;
            }

            markAudience(state, blockAudience);

            if (audience === 'preserve' || audience === blockAudience) {
                tokenizeBlockContent(state, params.content, 'visibility-directive');
            }

            return true;
        });
    };
}

function splitLines(content: string): string[] {
    return content.match(/[^\r\n]*(?:\r\n|\n|\r)|[^\r\n]+$/g) ?? [];
}

function nestBlocks(blocks: VisibilityBlock[]): VisibilityBlock[] {
    const roots: VisibilityBlock[] = [];
    const stack: VisibilityBlock[] = [];

    for (const block of blocks.sort((left, right) => {
        const startDiff = left.params.startLine - right.params.startLine;
        return startDiff || right.params.endLine - left.params.endLine;
    })) {
        while (
            stack.length &&
            block.params.startLine >= stack[stack.length - 1].params.content.endLine
        ) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (parent && block.params.endLine <= parent.params.content.endLine) {
            parent.children.push(block);
        } else {
            roots.push(block);
        }
        stack.push(block);
    }

    return roots;
}

function filterRange(
    lines: string[],
    startLine: number,
    endLine: number,
    blocks: VisibilityBlock[],
    selectedAudience: ContentAudience,
): string {
    const parts: string[] = [];
    let cursorLine = startLine;

    for (const block of blocks) {
        const {params, audience} = block;
        parts.push(lines.slice(cursorLine, params.startLine).join(''));
        const filteredBody = filterRange(
            lines,
            params.content.startLine,
            params.content.endLine,
            block.children,
            selectedAudience,
        );
        if (audience === selectedAudience) {
            parts.push(filteredBody);
        }
        cursorLine = params.endLine;
    }

    parts.push(lines.slice(cursorLine, endLine).join(''));
    return parts.join('');
}

/**
 * Filters Markdown source for one content audience while preserving all unrelated source text.
 *
 * @param markdown Markdown source to filter.
 * @param audience Audience whose content should be retained.
 * @returns Filtered source, detected audiences, diagnostics, and character counts.
 */
export function filterAudienceContent(
    markdown: string,
    audience: ContentAudience,
): AudienceFilterResult {
    const detectedAudiences = new Set<ContentAudience>();
    const errors: VisibilityError[] = [];
    const blocks: VisibilityBlock[] = [];
    const md = new MarkdownItImpl({html: true}).use(directiveParser());

    registerContainerDirective(md, 'visibility', (state, params) => {
        const rawAudience = params.contentTitle?.raw ?? '';
        const blockAudience = parseAudience(rawAudience);
        blocks.push({audience: blockAudience, params, children: []});

        if (blockAudience) {
            addAudience(detectedAudiences, blockAudience);
        } else {
            errors.push(createVisibilityError(rawAudience, params.startLine + 1));
        }

        // Parse nested directives in the original block state. Their line maps remain relative to
        // the complete source, so reconstruction below can preserve list indentation exactly.
        tokenizeBlockContent(state, params.content, 'visibility-directive');
        return true;
    });

    md.parse(markdown, {});
    const lines = splitLines(markdown);
    const content = filterRange(lines, 0, lines.length, nestBlocks(blocks), audience);
    const originalCharacters = Array.from(markdown).length;
    const filteredCharacters = Array.from(content).length;

    return {
        content,
        audience: orderedAudiences(detectedAudiences),
        originalCharacters,
        filteredCharacters,
        removedCharacters: originalCharacters - filteredCharacters,
        errors,
    };
}

const visibilityPlugin: MarkdownItPluginCb = (md, options) => {
    const lint = options.isLintRun;
    md.use(
        visibility({
            audience: lint ? 'preserve' : (options.contentAudience ?? 'human'),
            lint,
            onError: lint
                ? undefined
                : (error) =>
                      options.log.error(
                          `${error.message}${options.path ? ` in ${options.path}` : ''}`,
                      ),
        }),
    );
};

export default visibilityPlugin;

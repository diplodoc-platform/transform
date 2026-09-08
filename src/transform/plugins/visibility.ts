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
};

const AUDIENCE_ORDER: ContentAudience[] = ['human', 'agent'];

function parseAudience(value = ''): ContentAudience | undefined {
    if (value === 'humans') {
        return 'human';
    }
    if (value === 'agents') {
        return 'agent';
    }
    return undefined;
}

function createVisibilityError(value: string, line: number): VisibilityError {
    const printableValue = value || '<empty>';
    return {
        line,
        value,
        message: `Invalid visibility audience "${printableValue}" at line ${line}; expected "humans" or "agents"`,
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
    const currentMeta =
        state.env.meta && typeof state.env.meta === 'object' && !Array.isArray(state.env.meta)
            ? (state.env.meta as VisibilityMeta)
            : {};
    const visibilityAudiences = orderedAudiences([
        ...(currentMeta.visibilityAudiences ?? []),
        audience,
    ]);

    state.env.meta = {...currentMeta, visibilityAudiences};
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
    onError,
}: VisibilityOptions = {}): MarkdownIt.PluginSimple {
    return (md) => {
        md.use(directiveParser());
        registerContainerDirective(md, 'visibility', (state, params) => {
            const rawAudience = params.contentTitle?.raw ?? '';
            const blockAudience = parseAudience(rawAudience);

            if (!blockAudience) {
                onError?.(createVisibilityError(rawAudience, params.startLine + 1));
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

function filterSegment(
    markdown: string,
    selectedAudience: ContentAudience,
    detectedAudiences: Set<ContentAudience>,
    errors: VisibilityError[],
    lineOffset = 0,
): string {
    const blocks: VisibilityBlock[] = [];
    const md = new MarkdownItImpl({html: true}).use(directiveParser());

    registerContainerDirective(md, 'visibility', (_state, params) => {
        const rawAudience = params.contentTitle?.raw ?? '';
        const blockAudience = parseAudience(rawAudience);
        blocks.push({audience: blockAudience, params});

        if (blockAudience) {
            addAudience(detectedAudiences, blockAudience);
        } else {
            errors.push(createVisibilityError(rawAudience, lineOffset + params.startLine + 1));
        }

        // Consume the outer block as a unit. Selected bodies are parsed recursively below so edits
        // never overlap and source outside visibility directives remains byte-for-byte intact.
        return true;
    });

    md.parse(markdown, {});
    if (!blocks.length) {
        return markdown;
    }

    const lines = splitLines(markdown);
    const parts: string[] = [];
    let cursorLine = 0;

    for (const block of blocks.sort(
        (left, right) => left.params.startLine - right.params.startLine,
    )) {
        const {params, audience} = block;
        if (params.startLine < cursorLine) {
            continue;
        }

        parts.push(lines.slice(cursorLine, params.startLine).join(''));
        const body = lines.slice(params.content.startLine, params.content.endLine).join('');
        const filteredBody = filterSegment(
            body,
            selectedAudience,
            detectedAudiences,
            errors,
            lineOffset + params.content.startLine,
        );
        if (audience === selectedAudience) {
            parts.push(filteredBody);
        }
        cursorLine = params.endLine;
    }

    parts.push(lines.slice(cursorLine).join(''));
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
    const content = filterSegment(markdown, audience, detectedAudiences, errors);
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
    md.use(
        visibility({
            audience: options.contentAudience ?? 'human',
            onError: (error) =>
                options.log.error(`${error.message}${options.path ? ` in ${options.path}` : ''}`),
        }),
    );
};

export default visibilityPlugin;

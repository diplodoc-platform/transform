import type {MarkdownIt, Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownItPluginOpts} from '../../typings';
import type {DeprecationDescriptor} from '../../deprecation';
import type {LogConsumer} from '../../log';
import type {ImsizeOptions} from './plugin';

import {createDeprecationReporter} from '../../deprecation';

import {imageWithSize} from './plugin';
import {legacyImageUsage, markLegacyImage} from './positions';

const legacyDimensions: DeprecationDescriptor = {
    code: 'IMAGE_SIZE_LEGACY_SYNTAX',
    feature: 'Legacy image dimensions =AxB',
    replacement: '{width=... height=...} immediately after the image',
    removal: {version: '6.0.0'},
};

type DiagnosticContext = Partial<
    Pick<MarkdownItPluginOpts, 'path' | 'deprecations' | 'compatibility'>
> & {log?: LogConsumer};

function usages(tokens: Token[]): {path?: string}[] {
    return tokens.flatMap((token) => {
        const usage = legacyImageUsage(token);
        return [...(usage ? [usage] : []), ...usages(token.children ?? [])];
    });
}

/**
 * Install image dimensions without depending on general Markdown attributes.
 * Forked from https://github.com/tatsy/markdown-it-imsize
 * @param md - Native parser instance.
 * @param opts - Feature options and optional embedding diagnostic scope.
 * @returns Nothing; registers inline parsing and actual-use diagnostics.
 */
const imsize = (md: MarkdownIt, opts: ImsizeOptions & DiagnosticContext = {}) => {
    md.inline.ruler.before(
        'emphasis',
        'image',
        imageWithSize(md, opts, {
            image: (span, token) => markLegacyImage(token, span.path),
        }),
    );
    md.core.ruler.after('inline', 'imsize_deprecation', (state) => {
        const images = usages(state.tokens);
        if (!images.length) {
            return;
        }
        // Standalone native calls get a new scope; injected reporters remain caller-owned.
        const reporter = opts.deprecations ?? createDeprecationReporter(opts);
        for (const image of images) {
            const path = image.path?.trim() ? image.path : opts.path;
            reporter.warn(
                legacyDimensions,
                path?.trim() ? {location: {path}} : {option: 'imsize legacy image dimensions'},
            );
        }
    });
};

export default imsize;

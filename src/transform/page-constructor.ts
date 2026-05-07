import type {PageContent} from '@diplodoc/page-constructor-extension';
import type MarkdownIt from 'markdown-it';
import type {Lang} from './typings';

import {normalizePageConstructorContent} from '@diplodoc/page-constructor-extension';

export interface SerializePageConstructorOptions {
    path?: string;
    root?: string;
    assetsPublicPath?: string;
    transformLink?: (href: string) => string;
    assetLinkResolver?: (
        link: string,
        path?: string,
        root?: string,
        assetsPublicPath?: string,
    ) => string;
    contentLinkResolver?: (link: string, path?: string, root?: string) => string;
    lang?: Lang;
    md: MarkdownIt;
    env?: Record<string, unknown>;
}

export interface PageConstructorSerializationResult {
    kind: 'page-constructor';
    data: PageContent;
}

export function serializePageConstructor(
    originInput: string,
    {lang = 'en', env = {}, md, ...options}: SerializePageConstructorOptions,
): PageConstructorSerializationResult {
    const data = normalizePageConstructorContent(originInput, {
        ...options,
        md,
        env: {
            lang,
            ...env,
        },
    });

    return {
        kind: 'page-constructor',
        data,
    };
}

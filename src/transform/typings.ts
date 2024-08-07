import {LanguageFn} from 'highlight.js';
import DefaultMarkdownIt from 'markdown-it';
import DefaultStateCore from 'markdown-it/lib/rules_core/state_core';
import {SanitizeOptions} from './sanitize';
import {MarkdownItPluginCb} from './plugins/typings';
import {LogLevels} from './log';
import {ChangelogItem} from './plugins/changelog/types';

export interface MarkdownIt extends DefaultMarkdownIt {
    assets?: string[];
    meta?: string[];
}
export interface StateCore extends DefaultStateCore {
    md: MarkdownIt;
}

export type HighlightLangMap = Record<string, LanguageFn>;

export type Heading = {
    title: string;
    href: string;
    level: number;
    items?: Heading[];
};

export interface FsContext {
    read(path: string): string;
    exist(path: string): boolean;
    write(path: string, content: string): void;
}

export interface RevisionMeta {
    files: {
        [key: string]: {
            mod_date: number; // modified_at
            files: string[]; // dependedcies
            vars: string[];
            changed: boolean;
        };
    };
}

export interface RevisionContext {
    files: string[];
    meta: RevisionMeta | null;
    // deps: {
    //     [key: string]: {
    //         files: string[];
    //         vars: string[];
    //     };
    // };
}

export interface OptionsType {
    vars?: Record<string, string>;
    path?: string;
    extractTitle?: boolean;
    cached?: boolean;
    needTitle?: boolean;
    allowHTML?: boolean;
    linkify?: boolean;
    linkifyTlds?: string | string[];
    breaks?: boolean;
    conditionsInCode?: boolean;
    disableLiquid?: boolean;
    leftDelimiter?: string;
    rightDelimiter?: string;
    isLiquided?: boolean;
    needToSanitizeHtml?: boolean;
    sanitizeOptions?: SanitizeOptions;
    needFlatListHeadings?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: MarkdownItPluginCb<any>[];
    highlightLangs?: HighlightLangMap;
    extractChangelogs?: boolean;
    root?: string;
    rootPublicPath?: string;
    transformLink?: (href: string) => string;
    getPublicPath?: (options: OptionsType, href?: string) => string;
    context?: RevisionContext;
    fs?: FsContext;
    [x: string]: unknown;
}

export interface OutputType {
    result: {
        html: string;
    } & EnvType;
    logs: Record<LogLevels, string[]>;
}

export type EnvType<Extras extends {} = {}> = {
    title?: string;
    headings: Heading[];
    assets?: unknown[];
    meta?: object;
    changelogs?: ChangelogItem[];
} & Extras;

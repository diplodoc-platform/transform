import DefaultMarkdownIt from 'markdown-it';
import DefaultStateCore from 'markdown-it/lib/rules_core/state_core';

export interface MarkdownIt extends DefaultMarkdownIt {
    assets?: string[];
    meta?: string[];
}
export interface StateCore extends DefaultStateCore {
    md: MarkdownIt;
}

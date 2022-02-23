import DefaultMarkdownIt, {Options} from 'markdown-it';
import {MarkdownIt} from './typings';

export const initMd = ({html, linkify, highlight, breaks}: Partial<Options>) => {
    return new DefaultMarkdownIt({html, linkify, highlight, breaks}) as MarkdownIt;
};

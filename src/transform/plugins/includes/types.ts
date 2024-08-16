import {MarkdownIt} from '../../typings';

export interface MarkdownItIncluded extends MarkdownIt {
    included?: {
        [key: string]: string;
    };
}

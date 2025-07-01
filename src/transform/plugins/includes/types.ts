import type {MarkdownIt} from '../../typings';
import type {MarkdownItPluginOpts} from '../typings';

export interface MarkdownItIncluded extends MarkdownIt {
    included?: {
        [key: string]: string;
    };
}

export type IncludeCollectOpts = MarkdownItPluginOpts & {
    destPath: string;
    copyFile(path: string, dest: string, opts: IncludeCollectOpts): string | null | undefined;
    singlePage: Boolean;
    included: Boolean;
    includedParentPath?: string[];
    additionalIncludedList?: string[];
    appendix?: Map<string, string>;
};

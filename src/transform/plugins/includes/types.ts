import {MarkdownIt} from '../../typings';
import {MarkdownItPluginOpts} from '../typings';

export interface MarkdownItIncluded extends MarkdownIt {
    included?: {
        [key: string]: string;
    };
}

export type IncludeCollectOpts = MarkdownItPluginOpts & {
    destPath: string;
    copyFile(
        path: string,
        dest: string,
        opts: IncludeCollectOpts,
    ): Promise<string | null | undefined>;
    singlePage: Boolean;
    included: Boolean;
    includedParentPath?: string;
    additionalIncludedList?: string[];
    includesPaths?: string[];
    appendix?: Map<string, string>;
};

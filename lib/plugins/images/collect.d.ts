import { MarkdownItPluginOpts } from '../typings';
declare type Options = MarkdownItPluginOpts & {
    destPath: string;
    copyFile: (path: string, dest: string) => void;
    singlePage: boolean;
};
export declare const collect: (input: string, options: Options) => string | null;
export {};

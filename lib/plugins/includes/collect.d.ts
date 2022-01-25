import { MarkdownItPluginOpts } from '../typings';
declare type Opts = MarkdownItPluginOpts & {
    destPath: string;
    copyFile(path: string, dest: string, opts: Opts): void;
    singlePage: Boolean;
};
export declare const collect: (input: string, options: Opts) => string | null;
export {};

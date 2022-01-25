import Token from 'markdown-it/lib/token';
import { Logger } from 'src/transform/log';
import { MarkdownItPluginCb, MarkdownItPluginOpts } from '../typings';
import { StateCore } from 'src/transform/typings';
declare type Options = {
    hash: string | null;
    file: string;
    state: StateCore;
    opts: object;
    isEmptyLink: boolean;
    tokens: Token[];
    idx: number;
    nextToken: Token;
    href: string;
    currentPath: string;
    log: Logger;
};
interface ProcOpts extends MarkdownItPluginOpts {
    transformLink: (v: string) => string;
    notFoundCb: (v: string) => void;
    needSkipLinkFn: (v: string) => boolean;
}
declare const index: MarkdownItPluginCb<ProcOpts & Options>;
export default index;

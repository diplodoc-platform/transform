import { GetFileTokensOpts } from '../../utilsFS';
import { MarkdownItPluginCb, MarkdownItPluginOpts } from '../typings';
declare type Options = MarkdownItPluginOpts & GetFileTokensOpts & {
    notFoundCb: (v: string) => void;
    noReplaceInclude: boolean;
};
declare const index: MarkdownItPluginCb<Options>;
export default index;

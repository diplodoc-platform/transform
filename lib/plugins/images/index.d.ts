import { MarkdownItPluginCb, MarkdownItPluginOpts } from '../typings';
interface ImageOpts extends MarkdownItPluginOpts {
    assetsPublicPath: string;
}
interface SVGOpts extends MarkdownItPluginOpts {
    notFoundCb: (s: string) => void;
}
declare type Opts = SVGOpts & ImageOpts;
declare const index: MarkdownItPluginCb<Opts>;
export default index;

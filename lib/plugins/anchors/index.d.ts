import { MarkdownItPluginCb } from '../typings';
interface Options {
    extractTitle?: boolean;
    supportGithubAnchors?: boolean;
}
declare const index: MarkdownItPluginCb<Options>;
export default index;

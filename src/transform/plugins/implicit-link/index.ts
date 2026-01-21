import MarkdownIt from 'markdown-it';
import {replaceTokens} from './implicit-link';

const implicitLink = (md: MarkdownIt) => {
    md.core.ruler.after('links', 'implicit-link', replaceTokens);

    return md;
};

export default implicitLink;

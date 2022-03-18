import MarkdownIt from 'markdown-it';
import {sep} from 'path';
import url from 'url';
import {getHrefTokenAttr, isLocalUrl} from '../../utils';
import {getSinglePageAnchorId, resolveRelativePath} from '../../utilsFS';
import index from './index';
import {PAGE_LINK_REGEXP} from './constants';

const replaceLinkHref = (input: string, href: string, newHref: string) => {
    /* Try not replace include syntax */
    return input.replace(`](${href})`, `](${newHref})`);
};

type Options = {
    root: string;
    path: string;
    singlePage: boolean;
};

/* Replace the links to the markdown and yaml files if the singlePage option is passed in the options
 *  Example: replace [Text](../../path/to/file.md#anchor) with [Text](#_path_to_file_anchor)
 * */
const collect = (input: string, options: Options) => {
    const {root, path: startPath, singlePage} = options;

    if (!singlePage) {
        return;
    }

    let result = input;

    /* Syntax "{% include [Text](_includes/file.md) %}" is parsed as link. Need to ignore errors */
    const needSkipLinkFn = (href: string) => href.includes(`_includes${sep}`);
    const transformLink = (href: string) => href;
    const md = new MarkdownIt().use(index, {...options, transformLink, needSkipLinkFn});
    const tokens = md.parse(result, {});

    let i = 0;
    while (i < tokens.length) {
        if (tokens[i].type === 'inline') {
            const childrenTokens = tokens[i].children || [];
            let j = 0;

            while (j < childrenTokens.length) {
                const isLinkOpenToken = childrenTokens[j].type === 'link_open';

                if (!isLinkOpenToken) {
                    j++;
                    continue;
                }

                const linkToken = childrenTokens[j];
                const href = getHrefTokenAttr(linkToken);

                const isIncludeLink = resolveRelativePath(startPath, href).includes(
                    `_includes${sep}`,
                );

                if (!href || !isLocalUrl(href) || isIncludeLink) {
                    j++;
                    continue;
                }

                const {pathname, hash} = url.parse(href);
                if (pathname) {
                    const isPageFile = PAGE_LINK_REGEXP.test(pathname);
                    if (isPageFile) {
                        const newHref = getSinglePageAnchorId({
                            root,
                            currentPath: startPath,
                            pathname,
                            hash,
                        });
                        result = replaceLinkHref(result, href, newHref);
                    }
                } else if (hash) {
                    const newHref = getSinglePageAnchorId({root, currentPath: startPath, hash});
                    result = replaceLinkHref(result, href, newHref);
                }

                j++;
            }
        }

        i++;
    }

    // eslint-disable-next-line consistent-return
    return result;
};

export = collect;

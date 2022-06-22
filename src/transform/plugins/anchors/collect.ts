import _ from 'lodash';
import {sep} from 'path';

import {getSinglePageAnchorId, resolveRelativePath} from '../../utilsFS';
import {transformLinkToOriginalArticle} from '../../utils';
import {CUSTOM_ID_REGEXP, CUSTOM_ID_EXCEPTION} from './constants';
import {сarriage} from '../utils';
import {MarkdownItPluginOpts} from '../typings';

const slugify: (str: string, opts: {}) => string = require('slugify');

/* eslint-disable max-len */
/* If the singlePage option is passed in the options:
 *  - replace the default anchor and custom anchors with anchors with file at the beginning
 *  - increase the level of headers,
 *  - add page anchor to the first matched header
 *  Example for file index.md:
 *    Before: # Title {#CustomAnchor} {#custom-anchor}
 *            ## Subtitle
 *    After: ## Title {data-original-article=/index} {#_index} {#_index_title} {#_index_CustomAnchor} {#_index_custom-anchor}
 *           ## Subtitle {#_index_subtitle}
 * */
const collect = (input: string, options: MarkdownItPluginOpts & {singlePage: boolean}) => {
    const {root, path, singlePage} = options;

    if (!singlePage || path.includes(`_includes${sep}`)) {
        return;
    }

    const currentPath = resolveRelativePath(root, path);
    const pageId = getSinglePageAnchorId({root, currentPath});
    let needToSetPageId = true;
    let needToSetOriginalPathAttr = true;
    const lines = input.split(сarriage);
    let i = 0;
    const HEADER_LINK_REGEXP = /^(?<headerLevel>#+)\s(?<headerContent>.+)$/i;

    while (i < lines.length) {
        const line = lines[i];
        const headerMatch = line.match(HEADER_LINK_REGEXP);

        if (!headerMatch) {
            i++;
            continue;
        }

        const {headerLevel, headerContent} = headerMatch.groups as {
            headerLevel: string;
            headerContent: string;
        };

        let newHeaderContent = headerContent;
        const newCustomHeaders = [];

        while (CUSTOM_ID_REGEXP.test(newHeaderContent)) {
            newHeaderContent = newHeaderContent.replace(CUSTOM_ID_REGEXP, (match, customId) => {
                if (match === CUSTOM_ID_EXCEPTION) {
                    return match;
                }

                newCustomHeaders.push(`${pageId}_${customId}`);
                return '';
            });
        }
        newHeaderContent = newHeaderContent.trim();

        const slugifiedTitle = slugify(newHeaderContent, {lower: true});
        newCustomHeaders.push(`${pageId}_${slugifiedTitle}`);
        if (needToSetPageId) {
            newCustomHeaders.push(pageId);
            needToSetPageId = false;
        }

        const newCustomHeadersStr = _.chain(newCustomHeaders)
            .uniq()
            .map((id) => {
                return `{${id}}`;
            })
            .value()
            .join(' ');

        const baseHeaderSyntax = `${headerLevel}# ${newHeaderContent}`;
        lines[i] = `${baseHeaderSyntax} ${newCustomHeadersStr}`;

        if (needToSetOriginalPathAttr) {
            const originalArticleHref = transformLinkToOriginalArticle({root, currentPath});
            lines[
                i
            ] = `${baseHeaderSyntax} {data-original-article=${originalArticleHref}} ${newCustomHeadersStr}`;

            needToSetOriginalPathAttr = false;
        }

        i++;
    }

    // eslint-disable-next-line consistent-return
    return lines.join(сarriage);
};

export = collect;

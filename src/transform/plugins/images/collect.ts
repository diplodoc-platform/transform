import MarkdownIt from 'markdown-it';
import {relative} from 'path';

import {isLocalUrl} from '../../utils';
import {resolveRelativePath} from '../../utilsFS';
import imsize from '../imsize';
import {MarkdownItPluginOpts} from '../typings';

type Options = MarkdownItPluginOpts & {
    destPath: string;
    copyFile: (path: string, dest: string) => void;
    singlePage: boolean;
};

const collect = (input: string, options: Options) => {
    const md = new MarkdownIt().use(imsize);

    const {root, path, destPath = '', copyFile, singlePage} = options;
    const tokens = md.parse(input, {});
    let result = input;

    tokens.forEach((token) => {
        if (token.type !== 'inline') {
            return;
        }

        const children = token.children || [];

        children.forEach((childToken) => {
            if (childToken.type !== 'image') {
                return;
            }

            const src = childToken.attrGet('src') || '';

            if (!isLocalUrl(src)) {
                return;
            }

            const targetPath = resolveRelativePath(path, src);
            const targetDestPath = resolveRelativePath(destPath, src);

            if (singlePage && !path.includes('_includes/')) {
                const newSrc = relative(root, resolveRelativePath(path, src));

                result = result.replace(src, newSrc);
            }

            copyFile(targetPath, targetDestPath);
        });
    });

    if (singlePage) {
        return result;
    }

    return null;
};

export = collect;

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

const collect = async (input: string, options: Options) => {
    const md = new MarkdownIt().use(imsize);

    const {root, path, destPath = '', copyFile, singlePage, deps} = options;
    const tokens = md.parse(input, {});
    let result = input;

    for (const token of tokens) {
        if (token.type !== 'inline') {
            return;
        }

        const children = token.children || [];

        for (const childToken of children) {
            if (childToken.type !== 'image') {
                return;
            }

            const src = childToken.attrGet('src') || '';

            if (!isLocalUrl(src)) {
                return;
            }

            const targetPath = resolveRelativePath(path, src);
            const targetDestPath = resolveRelativePath(destPath, src);

            deps?.markDep?.(path, targetPath, 'image');

            if (singlePage && !path.includes('_includes/')) {
                const newSrc = relative(root, targetPath);
                result = result.replace(src, newSrc);
            }

            await copyFile(targetPath, targetDestPath);
        }
    }

    if (singlePage) {
        return result;
    }

    return null;
};

export = collect;

import MarkdownIt from 'markdown-it';

import {isLocalUrl} from '../../utils';
import {resolveRelativePath} from '../../utilsFS';
import imsize from '../imsize';
import {MarkdownItPluginOpts} from '../typings';

type Options = MarkdownItPluginOpts & {
    destPath: string;
    copyFile: (path: string, dest: string) => void;
};

const collect = (input: string, options: Options) => {
    const md = new MarkdownIt().use(imsize);

    const {path, destPath = '', copyFile} = options;
    const tokens = md.parse(input, {});

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

            copyFile(targetPath, targetDestPath);
        });
    });

    return null;
};

export = collect;

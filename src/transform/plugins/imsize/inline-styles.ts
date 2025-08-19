import type {Token} from 'markdown-it';

import {ImsizeAttr} from './const';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyInlineStyling(token: Token, env: any) {
    let style: string | undefined = '';

    const width = token.attrGet(ImsizeAttr.Width) || '';
    const height = token.attrGet(ImsizeAttr.Height) || '';

    const widthWithPercent = width.includes('%');
    const heightWithPercent = height.includes('%');

    if (width !== '') {
        const widthString = widthWithPercent ? width : `${width}px`;
        style += `width: ${widthString};`;
    }

    if (height !== '') {
        if (width !== '' && !heightWithPercent && !widthWithPercent) {
            style += `aspect-ratio: ${width} / ${height};height: auto;`;
            env.additionalOptionsCssWhiteList ??= {};
            env.additionalOptionsCssWhiteList['aspect-ratio'] = true;
        } else {
            const heightString = heightWithPercent ? height : `${height}px`;
            style += `height: ${heightString};`;
        }
    }

    if (style) {
        token.attrPush([ImsizeAttr.Style, style]);
    }
}

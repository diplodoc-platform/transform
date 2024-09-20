import {dump} from 'js-yaml';

import {FrontMatter, frontMatterFence} from './common';

export const serializeFrontMatter = (frontMatter: FrontMatter) => {
    const dumped = dump(frontMatter, {lineWidth: -1}).trim();

    // This empty object check is a bit naive
    // The other option would be to check if all own fields are `undefined`,
    // since we exploit passing in `undefined` to remove a field quite a bit
    if (dumped === '{}') {
        return '';
    }

    return `${frontMatterFence}\n${dumped}\n${frontMatterFence}\n`;
};

export const emplaceSerializedFrontMatter = (
    frontMatterStrippedContent: string,
    frontMatter: string,
) => `${frontMatter}${frontMatterStrippedContent}`;

export const emplaceFrontMatter = (frontMatterStrippedContent: string, frontMatter: FrontMatter) =>
    emplaceSerializedFrontMatter(frontMatterStrippedContent, serializeFrontMatter(frontMatter));

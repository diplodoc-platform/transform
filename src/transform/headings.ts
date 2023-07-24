import Token from 'markdown-it/lib/token';
import {Heading} from './typings';

function getTitle(token: Token) {
    return (
        token.children?.reduce((acc, tok) => {
            if (tok.type === 'text' || tok.type === 'code_inline') {
                return acc + tok.content;
            }

            return acc;
        }, '') || ''
    );
}

function getHref(token: Token) {
    return '#' + (token.attrGet('id') || '');
}

export = function getHeadings(tokens: Token[], needFlatListHeadings?: boolean) {
    return needFlatListHeadings ? getFlatListHeadings(tokens) : getFilteredHeadings(tokens);
};

function getFilteredHeadings(tokens: Token[]) {
    const headings: Heading[] = [];
    let parents = [headings];
    let prevLevel;

    for (let i = 0; i < tokens.length; i++) {
        const isHeading = tokens[i].type === 'heading_open';
        const level = Number.parseInt(tokens[i].tag.slice(1), 10);

        if (isHeading && level >= 2) {
            const entry = {
                title: getTitle(tokens[i + 1]),
                href: getHref(tokens[i]),
                level,
            };
            let closestParent = parents[parents.length - 1];

            if ((!prevLevel && level === 2) || prevLevel === level) {
                closestParent.push(entry);
                prevLevel = level;
                // skip if nested heading level is lower than for previous by 2 or more
            } else if (prevLevel && level - prevLevel === 1) {
                const lastItemInClosestParent = closestParent[closestParent.length - 1];
                const newParent = (lastItemInClosestParent.items = [entry]);

                parents.push(newParent);
                prevLevel = level;
            } else if (prevLevel && level < prevLevel) {
                const levelDiff = prevLevel - level;
                const closestParentIndex = parents.length - levelDiff - 1;

                if (closestParentIndex < 0) {
                    continue;
                }

                closestParent = parents[closestParentIndex];
                closestParent.push(entry);
                parents = parents.slice(0, closestParentIndex + 1);
                prevLevel = level;
            }
        }
    }

    return headings;
}
function getFlatListHeadings(tokens: Token[]) {
    const headings: Heading[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const isHeading = tokens[i].type === 'heading_open';
        const level = Number.parseInt(tokens[i].tag.slice(1), 10);

        if (!isHeading) {
            continue;
        }

        headings.push({
            title: getTitle(tokens[i + 1]),
            href: getHref(tokens[i]),
            level,
        });
    }

    return headings;
}

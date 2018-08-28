'use strict';

function getTitle(token) {
    return token.children.reduce((acc, token) => {
        if (token.type === 'text') {
            return acc + token.content;
        }

        return acc;
    }, '');
}

function getHref(token) {
    return '#' + (token.attrGet('id') || '');
}

module.exports = function getHeadings(tokens) {
    const headings = [];
    const parents = [headings];
    let prevLevel;

    for (let i = 0; i < tokens.length; i++) {
        const isHeading = tokens[i].type === 'heading_open';
        const level = Number.parseInt(tokens[i].tag.slice(1), 10);

        if (isHeading && level >= 2) {
            const entry = {
                title: getTitle(tokens[i + 1]),
                href: getHref(tokens[i]),
                level
            };
            let closestParent = parents[parents.length - 1];

            if (!prevLevel || prevLevel === level) {
                closestParent.push(entry);
                prevLevel = level;
            // skip if nested heading level is lower than for previous by 2 or more
            } else if (level - prevLevel === 1) {
                const lastItemInClosestParent = closestParent[closestParent.length - 1];
                const newParent = lastItemInClosestParent.items = [entry];

                parents.push(newParent);
                prevLevel = level;
            } else if (level < prevLevel) {
                for (let j = 0; j < prevLevel - level; j++) {
                    parents.pop();
                }
                closestParent = parents[parents.length - 1];
                closestParent.push(entry);
                prevLevel = level;
            }
        }
    }

    return headings;
};

const {bold} = require('chalk');

const {evalExp} = require('./evaluation');
const {tagLine, variable} = require('./lexical');
const log = require('../log');
const {removeIndentBlock} = require('./utils');

function inlineConditions({forTag, vars, content, match, path, lastIndex}) {
    let res = '';

    const forTemplate = content.substring(
        forTag.startPos + forTag.forRaw.length,
        match.index,
    );
    let collection = evalExp(forTag.collectionName, vars);
    if (!collection || !collection.forEach) {
        collection = [];
        log.error(`${bold(forTag.collectionName)} is undefined or not iterable`);
    }

    // eslint-disable-next-line global-require
    const applyLiquid = require('./index');
    collection.forEach((item) => {
        const newVars = {...vars, [forTag.variableName]: item};
        res += applyLiquid(forTemplate, newVars, path).trimRight();
    });

    let preparedLeftContent = content.substring(0, forTag.startPos);
    preparedLeftContent = res === '' ? removeIndentBlock(preparedLeftContent) : preparedLeftContent;

    let shift = 0;
    if (res === '' && preparedLeftContent[preparedLeftContent.length - 1] === '\n' && content[lastIndex] === '\n') {
        shift = 1;
    }

    if (res !== '') {
        if (res[0] === ' ' || res[0] === '\n') {
            res = res.substring(1);
        }
    }

    const leftPart = preparedLeftContent + res;

    return {
        result: leftPart + content.substring(lastIndex + shift),
        idx: leftPart.length,
    };
}

function cycles(originInput, vars, path) {
    const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;
    const FOR_SYNTAX = new RegExp(`(\\w+)\\s+in\\s+(${variable.source})`);

    let match;
    const tagStack = [];
    let input = originInput;

    while ((match = R_LIQUID.exec(input)) !== null) {
        if (!match[1]) {
            continue;
        }

        const tagMatch = match[2].trim().match(tagLine);
        if (!tagMatch) {
            continue;
        }

        const [type, args] = tagMatch.slice(1);

        switch (type) {
            case 'for': {
                const [variableName, collectionName] = args.match(FOR_SYNTAX).slice(1);
                tagStack.push({
                    item: args,
                    variableName,
                    collectionName,
                    startPos: match.index,
                    forRaw: match[1],
                });
                break;
            }
            case 'endfor': {
                const forTag = tagStack.pop();

                const {idx, result} = inlineConditions({
                    forTag,
                    vars,
                    content: input,
                    match,
                    path,
                    lastIndex: R_LIQUID.lastIndex,
                });
                R_LIQUID.lastIndex = idx;
                input = result;

                break;
            }
        }
    }

    if (tagStack.length !== 0) {
        log.error(`For block must be closed${path ? ` in ${bold(path)}` : ''}`);
    }

    return input;
}

module.exports = cycles;

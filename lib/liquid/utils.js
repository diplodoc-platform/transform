function removeIndentBlock(str) {
    let i = str.length - 1;
    let curChar = str[i];

    while (curChar === ' ') {
        curChar = str[--i];
    }

    if (curChar === '\n') {
        return str.substring(0, i + 1);
    }

    return str;
}

function getPreparedLeftContent({content, tagStartPos, tagContent}) {
    const preparedLeftContent = content.substring(0, tagStartPos);

    if (tagContent === '') {
        return removeIndentBlock(preparedLeftContent);
    }

    return preparedLeftContent;
}

module.exports = {
    removeIndentBlock,
    getPreparedLeftContent,
};

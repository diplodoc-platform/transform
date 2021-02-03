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

module.exports = {
    removeIndentBlock,
};

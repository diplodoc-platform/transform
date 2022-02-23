export function removeIndentBlock(str: string) {
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

type Opts = {
    content: string;
    tagStartPos: number;
    tagContent: string;
};

export function getPreparedLeftContent({content, tagStartPos, tagContent}: Opts) {
    const preparedLeftContent = content.substring(0, tagStartPos);

    if (tagContent === '') {
        return removeIndentBlock(preparedLeftContent);
    }

    return preparedLeftContent;
}

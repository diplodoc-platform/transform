const state = {
    blockquote: false,
    stack: [],
    tableColumns: []
};

const columnAligns = {
    'left': ':---',
    'right': '---:',
    'center': ':---:'
};

const getLastElement = () => state.stack.length > 0 ? state.stack[state.stack.length - 1] : {};

const getIndent = (counter) => (new Array(counter)).join('    ');

function insertContent(lastBlock, acc, {content}) {
    const isListItemTitle = lastBlock.paragraphCounter < 2;

    if (state.stack.length > 0) {
        acc += getIndent(state.stack.length + (isListItemTitle ? 0 : 1));
    }

    if (isListItemTitle && lastBlock.isOrderedList) {
        return acc + `${lastBlock.itemsCounter}. ${content}`;
    }

    if (isListItemTitle && lastBlock.isBulletList) {
        return acc + `* ${content}`;
    }

    if (state.blockquote) {
        return acc + `> ${content}`;
    }

    return acc + content;
}

function insertCode(acc, {content, markup, info, tag}) {
    const indent = getIndent(state.stack.length + 1);

    if (tag === 'code') {
        content = content.replace(/\n/ig, `\n${indent}`).trim();
        return acc + `${indent}${markup}${info}\n${indent}${content}\n${indent}${markup}\n\n`;
    }

    return acc;
}

function parseLists(lastBlock, acc, item) {
    switch (item.type) {
        case 'ordered_list_open': {
            state.stack.push({
                isOrderedList: true,
                itemsCounter: 0,
                paragraphCounter: 0
            });

            break;
        }
        case 'ordered_list_close': {
            state.stack.pop();

            break;
        }
        case 'list_item_open': {
            if (lastBlock.isOrderedList) {
                lastBlock.itemsCounter++;
            }

            break;
        }
        case 'list_item_close': {
            lastBlock.paragraphCounter = 0;

            break;
        }
        case 'bullet_list_open': {
            state.stack.push({
                isBulletList: true,
                isOpen: true,
                paragraphCounter: 0
            });

            break;
        }
        case 'bullet_list_close': {
            state.stack.pop();
            acc += '\n';

            break;
        }
    }

    return acc;
}

function parseTables(lastBlock, acc, item) {
    switch (item.type) {
        case 'thead_close': {
            acc = acc.substr(0, acc.length - 3) + '\n';

            acc += state.tableColumns.map((column) => columnAligns[column]).join(' | ') + '\n';

            break;
        }
        case 'tbody_close': {
            acc = acc.substr(0, acc.length - 3) + '\n';

            break;
        }
        case 'table_close': {
            state.tableColumns = [];
            acc += '\n';

            break;
        }
        case 'th_open': {
            if (!item.attrs || !item.attrs[0] || !item.attrs[0][1]) {
                break;
            }

            state.tableColumns.push(item.attrs[0][1].split(':').pop());

            break;
        }
        case 'td_close':
        case 'th_close': {
            acc += ' | ';

            break;
        }
    }

    return acc;
}

function renderer(tokens) {
    return tokens.reduce((acc, item) => {
        const lastBlock = getLastElement();

        acc = parseLists(lastBlock, acc, item);
        acc = parseTables(lastBlock, acc, item);

        switch (item.type) {
            case 'heading_open': {
                acc += item.markup;
                break;
            }

            case 'blockquote_open': {
                state.blockquote = true;
                break;
            }
            case 'blockquote_close': {
                state.blockquote = false;
                acc = acc.substr(0, acc.length - 2) + '\n\n';
                break;
            }

            case 'paragraph_open': {
                if (lastBlock.isOrderedList || lastBlock.isBulletList) {
                    lastBlock.paragraphCounter++;
                }
                break;
            }
            case 'heading_close':
            case 'paragraph_close':
                if (state.blockquote) {
                    acc += '>\n';
                    break;
                }

                acc += '\n\n';
                break;

            case 'hr': {
                acc += item.markup + '\n\n';
                break;
            }

            case 'fence': {
                acc = insertCode(acc, item);

                break;
            }

            case 'inline': {
                acc = insertContent(lastBlock, acc, item);
                break;
            }
        }

        return acc;
    }, '');
}

module.exports = renderer;

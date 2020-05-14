const {bold} = require('chalk');
const log = require('../log');

const ALERT_RE = /^{% note (alert|info|tip|warning)\s*(?:"(.*?)")? %}$/;
const WRONG_NOTES = /^{% note (.*)%}/;

const titles = {
    ru: {
        info: 'Примечание',
        tip: 'Совет',
        alert: 'Внимание',
        warning: 'Важно',
    },
    en: {
        info: 'Note',
        tip: 'Tip',
        alert: 'Alert',
        warning: 'Warning',
    },
};

function getTitle(type, originLang) {
    let lang = originLang;

    if (!lang || !Object.keys(titles).includes(lang)) {
        lang = 'ru';
    }

    return titles[lang][type];
}

function findCloseTokenIdx(tokens, idx, path) {
    let i = idx;
    while (i < tokens.length) {
        if (
            tokens[i].type === 'paragraph_open' &&
            tokens[i + 1].type === 'inline' &&
            tokens[i + 1].content.trim() === '{% endnote %}'
        ) {
            return i;
        }

        i++;
    }

    log.error(`Note must be closed${path ? ` in ${bold(path)}` : ''}`);

    return null;
}

function notes(md, {lang, path: optPath}) {
    const plugin = (state) => {
        const {tokens, env} = state;
        const path = env.path || optPath;
        let i = 0;

        while (i < tokens.length) {
            if (
                tokens[i].type === 'paragraph_open' &&
                tokens[i + 1].type === 'inline'
            ) {
                const match = tokens[i + 1].content.match(ALERT_RE);
                const wrongNotes = tokens[i + 1].content.match(WRONG_NOTES);

                if (!match) {
                    if (wrongNotes && tokens[i + 1].content !== '{% endnote %}') {
                        log.warn(
                            `Incorrect syntax for notes${path ? `, file ${bold(path)}` : ''}`,
                        );
                    }
                    i += 3;
                    continue;
                }

                const closeTokenIdx = findCloseTokenIdx(tokens, i + 4, path);

                if (!closeTokenIdx) {
                    i += 3;
                    continue;
                }

                const type = match[1].toLowerCase();
                const newOpenToken = new state.Token('paragraph_open', 'div', 1);
                newOpenToken.attrSet('class', `yfm-note yfm-accent-${type}`);
                const newCloseToken = new state.Token('paragraph_close', 'div', -1);

                // Add extra paragraph
                const paragraphOpen = new state.Token('paragraph_open', 'p', 1);
                const inline = new state.Token('inline', '', 0);
                const strongOpen = new state.Token('strong_open', 'strong', 1);
                const inlineText = new state.Token('text', '', 0);
                const strongClose = new state.Token('strong_close', 'strong', -1);
                const paragraphClose = new state.Token('paragraph_close', 'p', -1);

                paragraphOpen.block = true;
                paragraphClose.block = true;
                inlineText.content = match[2] === undefined ? getTitle(type, lang) : match[2];
                inline.children = [strongOpen, inlineText, strongClose];

                const insideTokens = [
                    newOpenToken,
                    paragraphOpen,
                    inline,
                    paragraphClose,
                    ...tokens.slice(i + 3, closeTokenIdx),
                    newCloseToken,
                ];
                tokens.splice(i, closeTokenIdx - i + 3, ...insideTokens);

                i += insideTokens.length;
            } else {
                i++;
            }
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'notes', plugin);
    } catch (e) {
        md.core.ruler.push('notes', plugin);
    }
}

module.exports = notes;

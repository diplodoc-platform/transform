const {bold} = require('chalk');

const {nestedCloseTokenIdxFactory: closeTokenFactory} = require('./utils');

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
function matchCloseToken(tokens, i) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endnote %}'
    );
}

function matchOpenToken(tokens, i) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(ALERT_RE)
    );
}

function matchWrongNotes(tokens, i) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(WRONG_NOTES)
    );
}

const findCloseTokenIdx = closeTokenFactory('Note', matchOpenToken, matchCloseToken);

function notes(md, {lang, path: optPath, log}) {
    const plugin = (state) => {
        const {tokens, env} = state;
        const path = env.path || optPath;
        let i = 0;

        while (i < tokens.length) {
            const match = matchOpenToken(tokens, i);

            if (match) {
                const closeTokenIdx = findCloseTokenIdx(tokens, i + 4, path, log);

                if (!closeTokenIdx) {
                    i += 3;
                    continue;
                }

                const type = match[1].toLowerCase();
                const newOpenToken = new state.Token('yfm_note_open', 'div', 1);
                newOpenToken.attrSet('class', `yfm-note yfm-accent-${type}`);
                newOpenToken.attrSet('note-type', type);
                const newCloseToken = new state.Token('yfm_note_close', 'div', -1);

                // Add extra paragraph
                const titleOpen = new state.Token('yfm_note_title_open', 'p', 1);
                const inline = new state.Token('inline', '', 0);
                const strongOpen = new state.Token('strong_open', 'strong', 1);
                const inlineText = new state.Token('text', '', 0);
                const strongClose = new state.Token('strong_close', 'strong', -1);
                const titleClose = new state.Token('yfm_note_title_close', 'p', -1);

                titleOpen.block = true;
                titleClose.block = true;
                inlineText.content = match[2] === undefined ? getTitle(type, lang) : match[2];
                inline.children = [strongOpen, inlineText, strongClose];

                const insideTokens = [
                    newOpenToken,
                    titleOpen,
                    inline,
                    titleClose,
                    ...tokens.slice(i + 3, closeTokenIdx),
                    newCloseToken,
                ];
                tokens.splice(i, closeTokenIdx - i + 3, ...insideTokens);

                i++;
            } else if (matchWrongNotes(tokens, i) && tokens[i + 1].content !== '{% endnote %}') {
                log.warn(
                    `Incorrect syntax for notes${path ? `, file ${bold(path)}` : ''}`,
                );

                i += 3;
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

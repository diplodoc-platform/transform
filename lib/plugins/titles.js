const {bold} = require('chalk');
const log = require('../log');

const TITLE_RE = /^#{1,}[^\s#]{1}.*$/;

function titles(md, {path}) {
    md.core.ruler.push('titles', (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (
                tokens[i].type === 'paragraph_open' &&
                tokens[i + 1].type === 'inline'
            ) {
                const wrongTitle = tokens[i + 1].content.match(TITLE_RE);

                if (wrongTitle) {
                    const linkToSyntax = 'https://www.markdownguide.org/basic-syntax/#headings';

                    // eslint-disable-next-line max-len
                    log.warn(`Incorrect syntax for title${path ? ` in ${bold(path)}` : ''}! Check out syntax: ${linkToSyntax}`);
                }
            }
            i++;
        }
    });
}

module.exports = titles;

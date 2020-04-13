const log = require('../log');

const TITLE_RE = /^#{1,}[^\s#]{1}.*$/;

function titles(md) {
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
                    const mismatchLine = tokens[i + 1].map[1];
                    log.warn(`Incorrect syntax for title in line ${mismatchLine}! Check out syntax: ${linkToSyntax}`);
                }
            }
            i++;
        }
    });
}

module.exports = titles;

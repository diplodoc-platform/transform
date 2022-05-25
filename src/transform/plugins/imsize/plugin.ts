import type MarkdownIt from 'markdown-it';
import type ParserInline from 'markdown-it/lib/parser_inline';
import type Token from 'markdown-it/lib/token';
import {ImsizeAttr} from './const';
import {parseImageSize} from './helpers';

export const imageWithSize = (md: MarkdownIt): ParserInline.RuleInline => {
    // eslint-disable-next-line complexity
    return (state, silent) => {
        if (state.src.charCodeAt(state.pos) !== 0x21 /* ! */) {
            return false;
        }

        if (state.src.charCodeAt(state.pos + 1) !== 0x5b /* [ */) {
            return false;
        }

        const labelStart = state.pos + 2;
        const labelEnd = md.helpers.parseLinkLabel(state, state.pos + 1, false);

        // parser failed to find ']', so it's not a valid link
        if (labelEnd < 0) {
            return false;
        }

        let href = '';
        let title = '';
        let width = '';
        let height = '';

        const oldPos = state.pos;
        const max = state.posMax;

        let pos = labelEnd + 1;
        if (pos < max && state.src.charCodeAt(pos) === 0x28 /* ( */) {
            //
            // Inline link
            //

            // [link](  <href>  "title"  )
            //        ^^ skipping these spaces
            pos++;
            for (; pos < max; pos++) {
                const code = state.src.charCodeAt(pos);
                if (code !== 0x20 && code !== 0x0a) {
                    break;
                }
            }
            if (pos >= max) {
                return false;
            }

            // [link](  <href>  "title"  )
            //          ^^^^^^ parsing link destination
            let start = pos;
            const destResult = md.helpers.parseLinkDestination(state.src, pos, state.posMax);
            if (destResult.ok) {
                href = state.md.normalizeLink(destResult.str);
                if (state.md.validateLink(href)) {
                    pos = destResult.pos;
                } else {
                    href = '';
                }
            }

            // [link](  <href>  "title"  )
            //                ^^ skipping these spaces
            start = pos;
            for (; pos < max; pos++) {
                const code = state.src.charCodeAt(pos);
                if (code !== 0x20 && code !== 0x0a) {
                    break;
                }
            }

            // [link](  <href>  "title"  )
            //                  ^^^^^^^ parsing link title
            const titleResult = md.helpers.parseLinkTitle(state.src, pos, state.posMax);
            if (pos < max && start !== pos && titleResult.ok) {
                title = titleResult.str;
                pos = titleResult.pos;

                // [link](  <href>  "title"  )
                //                         ^^ skipping these spaces
                for (; pos < max; pos++) {
                    const code = state.src.charCodeAt(pos);
                    if (code !== 0x20 && code !== 0x0a) {
                        break;
                    }
                }
            } else {
                title = '';
            }

            // [link](  <href>  "title" =WxH  )
            //                          ^^^^ parsing image size
            if (pos - 1 >= 0) {
                const code = state.src.charCodeAt(pos - 1);

                // there must be at least one white spaces
                // between previous field and the size
                if (code === 0x20) {
                    const sizeResult = parseImageSize(state.src, pos, state.posMax);
                    if (sizeResult.ok) {
                        width = sizeResult.width;
                        height = sizeResult.height;
                        pos = sizeResult.pos;

                        // [link](  <href>  "title" =WxH  )
                        //                              ^^ skipping these spaces
                        for (; pos < max; pos++) {
                            const code = state.src.charCodeAt(pos);
                            // eslint-disable-next-line max-depth
                            if (code !== 0x20 && code !== 0x0a) {
                                break;
                            }
                        }
                    }
                }
            }

            if (pos >= max || state.src.charCodeAt(pos) !== 0x29 /* ) */) {
                state.pos = oldPos;
                return false;
            }
            pos++;
        } else {
            //
            // Link reference
            //
            if (typeof state.env.references === 'undefined') {
                return false;
            }

            // [foo]  [bar]
            //      ^^ optional whitespace (can include newlines)
            for (; pos < max; pos++) {
                const code = state.src.charCodeAt(pos);
                if (code !== 0x20 && code !== 0x0a) {
                    break;
                }
            }

            let label = '';

            if (pos < max && state.src.charCodeAt(pos) === 0x5b /* [ */) {
                const start = pos + 1;
                pos = md.helpers.parseLinkLabel(state, pos);
                if (pos >= 0) {
                    label = state.src.slice(start, pos++);
                } else {
                    pos = labelEnd + 1;
                }
            } else {
                pos = labelEnd + 1;
            }

            // covers label === '' and label === undefined
            // (collapsed reference link and shortcut reference link respectively)
            if (!label) {
                label = state.src.slice(labelStart, labelEnd);
            }

            const ref = state.env.references[md.utils.normalizeReference(label)];
            if (!ref) {
                state.pos = oldPos;
                return false;
            }
            href = ref.href;
            title = ref.title;
        }

        //
        // We found the end of the link, and know for a fact it's a valid link;
        // so all that's left to do is to call tokenizer.
        //
        if (!silent) {
            state.pos = labelStart;
            state.posMax = labelEnd;

            const tokens: Token[] = [];
            const newState = new state.md.inline.State(
                state.src.slice(labelStart, labelEnd),
                state.md,
                state.env,
                tokens,
            );
            newState.md.inline.tokenize(newState);

            const token = state.push('image', 'img', 0);
            token.children = tokens;
            token.attrs = [
                [ImsizeAttr.Src, href],
                [ImsizeAttr.Alt, ''],
            ];

            if (title) {
                token.attrs.push([ImsizeAttr.Title, title]);
            }

            if (width !== '') {
                token.attrs.push([ImsizeAttr.Width, width]);
            }

            if (height !== '') {
                token.attrs.push([ImsizeAttr.Height, height]);
            }
        }

        state.pos = pos;
        state.posMax = max;
        return true;
    };
};

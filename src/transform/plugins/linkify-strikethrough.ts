import type {Delimiter} from 'markdown-it/lib/rules_inline/state_inline';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';
import type {MarkdownIt} from '../typings';

// Matches the scheme expression used by markdown-it's built-in linkify rule.
const SCHEME_RE = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;
const ASTERISK_MARKER = 0x2a;
const UNDERSCORE_MARKER = 0x5f;
const TILDE_MARKER = 0x7e;

// linkLevel exists at runtime in markdown-it but is missing from the public type.
type LinkifyState = StateInline & {
    linkLevel: number;
};

type LinkifyMatch = NonNullable<ReturnType<MarkdownIt['linkify']['match']>>[number];

// matchAtStart exists in linkify-it but is missing from the installed types.
type LinkifyWithMatchAtStart = MarkdownIt['linkify'] & {
    matchAtStart(value: string): LinkifyMatch | null;
};

type DelimiterScanState = {
    scannedCount: number;
    unmatchedOpeners: Map<number, number>;
};

function getUnmatchedOpeners(
    delimiters: Delimiter[],
    scanStates: WeakMap<Delimiter[], DelimiterScanState>,
) {
    let scanState = scanStates.get(delimiters);
    if (!scanState || scanState.scannedCount > delimiters.length) {
        scanState = {scannedCount: 0, unmatchedOpeners: new Map()};
        scanStates.set(delimiters, scanState);
    }

    // Process only new delimiters to keep the overall scan linear.
    for (let index = scanState.scannedCount; index < delimiters.length; index++) {
        const delimiter = delimiters[index];
        if (delimiter.marker !== TILDE_MARKER && delimiter.marker !== UNDERSCORE_MARKER) {
            continue;
        }

        const unmatchedOpeners = scanState.unmatchedOpeners.get(delimiter.marker) || 0;
        if (delimiter.close && unmatchedOpeners > 0) {
            scanState.unmatchedOpeners.set(delimiter.marker, unmatchedOpeners - 1);
        } else if (delimiter.open) {
            scanState.unmatchedOpeners.set(delimiter.marker, unmatchedOpeners + 1);
        }
    }

    scanState.scannedCount = delimiters.length;

    return new Map(scanState.unmatchedOpeners);
}

function trimMarkdownSuffix(value: string, unmatchedOpeners: Map<number, number>) {
    let end = value.length;

    while (end > 0) {
        const previousEnd = end;

        // Preserve the built-in linkify rule's handling of emphasis markers.
        while (end > 0 && value.codePointAt(end - 1) === ASTERISK_MARKER) {
            end--;
        }

        let unmatchedStrikethrough = unmatchedOpeners.get(TILDE_MARKER) || 0;
        while (
            unmatchedStrikethrough > 0 &&
            end >= 2 &&
            value.codePointAt(end - 1) === TILDE_MARKER &&
            value.codePointAt(end - 2) === TILDE_MARKER
        ) {
            end -= 2;
            unmatchedStrikethrough--;
        }
        unmatchedOpeners.set(TILDE_MARKER, unmatchedStrikethrough);

        let unmatchedEmphasis = unmatchedOpeners.get(UNDERSCORE_MARKER) || 0;
        while (
            unmatchedEmphasis > 0 &&
            end > 0 &&
            value.codePointAt(end - 1) === UNDERSCORE_MARKER
        ) {
            end--;
            unmatchedEmphasis--;
        }
        unmatchedOpeners.set(UNDERSCORE_MARKER, unmatchedEmphasis);

        if (end === previousEnd) {
            break;
        }
    }

    return end;
}

// The built-in linkify rule also excludes trailing stars from URLs.
function trimTrailingStars(value: string) {
    let end = value.length;

    while (end > 0 && value[end - 1] === '*') {
        end--;
    }

    return value.slice(0, end);
}

export default function linkifyStrikethrough(md: MarkdownIt) {
    // Each inline nesting level has its own delimiter array and scan progress.
    const delimiterScanStates = new WeakMap<Delimiter[], DelimiterScanState>();

    // Replace the existing rule under the same name so md.disable('linkify') still works.
    md.inline.ruler.at('linkify', (rawState, silent) => {
        const state = rawState as LinkifyState;
        const pos = state.pos;

        if (
            !state.md.options.linkify ||
            state.linkLevel > 0 ||
            pos + 3 > state.posMax ||
            state.src.codePointAt(pos) !== 0x3a /* : */ ||
            state.src.codePointAt(pos + 1) !== 0x2f /* / */ ||
            state.src.codePointAt(pos + 2) !== 0x2f /* / */
        ) {
            return false;
        }

        const schemeMatch = SCHEME_RE.exec(state.pending);
        if (!schemeMatch) {
            return false;
        }

        const scheme = schemeMatch[1];
        const linkify = state.md.linkify as LinkifyWithMatchAtStart;
        const linkSource = state.src.slice(pos - scheme.length);
        let link = linkify.matchAtStart(linkSource);
        if (!link) {
            return false;
        }

        const unmatchedOpeners = getUnmatchedOpeners(state.delimiters, delimiterScanStates);
        const linkSourceEnd = trimMarkdownSuffix(link.raw, unmatchedOpeners);
        if (linkSourceEnd < link.raw.length) {
            // Match again without closing markup so linkify can also restore punctuation boundaries.
            link = linkify.matchAtStart(linkSource.slice(0, linkSourceEnd));
            if (!link) {
                return false;
            }
        }

        const url = trimTrailingStars(link.url);
        if (url.length <= scheme.length) {
            return false;
        }

        const href = state.md.normalizeLink(url);
        if (!state.md.validateLink(href)) {
            return false;
        }

        // Silent mode checks whether the rule applies without creating tokens.
        if (!silent) {
            state.pending = state.pending.slice(0, -scheme.length);

            const linkOpen = state.push('link_open', 'a', 1);
            linkOpen.attrs = [['href', href]];
            linkOpen.markup = 'linkify';
            linkOpen.info = 'auto';

            const linkText = state.push('text', '', 0);
            linkText.content = state.md.normalizeLinkText(url);

            const linkClose = state.push('link_close', 'a', -1);
            linkClose.markup = 'linkify';
            linkClose.info = 'auto';
        }

        // The scheme is already in pending, so advance only over the rest of the URL.
        state.pos += url.length - scheme.length;
        return true;
    });
}

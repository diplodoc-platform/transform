import type {Delimiter} from 'markdown-it/lib/rules_inline/state_inline';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';
import type {MarkdownIt} from '../typings';

// Matches the scheme expression used by markdown-it's built-in linkify rule.
const SCHEME_RE = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;
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
    unmatchedOpeners: number;
};

function hasUnmatchedStrikethroughOpener(
    delimiters: Delimiter[],
    scanStates: WeakMap<Delimiter[], DelimiterScanState>,
) {
    let scanState = scanStates.get(delimiters);
    if (!scanState || scanState.scannedCount > delimiters.length) {
        scanState = {scannedCount: 0, unmatchedOpeners: 0};
        scanStates.set(delimiters, scanState);
    }

    // Process only new delimiters to keep the overall scan linear.
    for (let index = scanState.scannedCount; index < delimiters.length; index++) {
        const delimiter = delimiters[index];
        if (delimiter.marker !== TILDE_MARKER) {
            continue;
        }

        if (delimiter.close && scanState.unmatchedOpeners > 0) {
            scanState.unmatchedOpeners--;
        } else if (delimiter.open) {
            scanState.unmatchedOpeners++;
        }
    }

    scanState.scannedCount = delimiters.length;

    return scanState.unmatchedOpeners > 0;
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
        const link = linkify.matchAtStart(state.src.slice(pos - scheme.length));
        if (!link) {
            return false;
        }

        // Trailing "~~" is markup only when an unmatched opener exists.
        const hasClosingStrikethroughMarker =
            link.url.endsWith('~~') &&
            hasUnmatchedStrikethroughOpener(state.delimiters, delimiterScanStates);
        const matchedUrl = hasClosingStrikethroughMarker ? link.url.slice(0, -2) : link.url;

        const url = trimTrailingStars(matchedUrl);
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

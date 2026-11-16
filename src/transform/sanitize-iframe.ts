import type {Attributes, Tag} from 'sanitize-html';

const MODE = 'data-yfm-sandbox-mode';
const CSP = "script-src 'none'; object-src 'none'; base-uri 'none'";

/**
 * Preserve passive HTML embeds without arbitrary srcdoc or sandbox escapes.
 *
 * @param tagName The parsed iframe tag.
 * @param attributes Untrusted outer attributes.
 * @param sanitizeContent The outer policy applied to embedded markup.
 * @returns The safe outer tag and attributes.
 */
export function sanitizeIframe(
    tagName: string,
    attributes: Attributes,
    sanitizeContent?: (html: string) => string,
): Tag {
    const attribs = {...attributes};

    // Drop every srcdoc casing variant before restoring its safe value. Browser
    // parsing must not select a different duplicate attribute than the sanitizer.
    for (const name of Object.keys(attribs)) {
        if (name.toLowerCase() === 'srcdoc') {
            delete attribs[name];
        }
    }

    if (!sanitizeContent || !isPassiveIframe(attributes)) {
        return {tagName, attribs};
    }

    const flags = attributes.sandbox.split(/[\t\n\f\r ]+/).filter(Boolean);

    const content = sanitizeContent(attributes.srcdoc);
    for (const name of Object.keys(attribs)) {
        if (name.toLowerCase() === 'sandbox') delete attribs[name];
    }
    attribs.sandbox = flags.length ? 'allow-same-origin' : '';
    attribs.srcdoc =
        '<!DOCTYPE html><html><head>' +
        `<meta http-equiv="Content-Security-Policy" content="${CSP}">` +
        `</head><body>${content}</body></html>`;

    // srcdoc has precedence in modern browsers; leave no active fallback URL.
    for (const name of Object.keys(attribs)) {
        if (name.toLowerCase() === 'src') {
            delete attribs[name];
        }
    }

    return {tagName, attribs};
}

/**
 * Validate the complete attribute pair, including after outer attribute filtering.
 *
 * @param attributes Parsed or filtered iframe attributes.
 * @returns Whether the iframe cannot execute scripts or escape its sandbox.
 */
export function isPassiveIframe(attributes: Attributes): boolean {
    return (
        attributes[MODE] === 'srcdoc' &&
        Object.prototype.hasOwnProperty.call(attributes, 'srcdoc') &&
        Object.prototype.hasOwnProperty.call(attributes, 'sandbox') &&
        attributes.sandbox
            .split(/[\t\n\f\r ]+/)
            .filter(Boolean)
            .every((flag) => flag === 'allow-same-origin')
    );
}

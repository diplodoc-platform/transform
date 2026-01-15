import type {Attributes, Tag} from 'sanitize-html';
import type {CssWhiteList} from './typings';

import sanitizeHtml from 'sanitize-html';
// @ts-ignore
import cssfilter from 'cssfilter';
import * as cheerio from 'cheerio';
import css from 'css';

import log from './log';

export type SanitizeFunction = (
    html: string,
    options?: SanitizeOptions,
    additionalOptions?: SanitizeOptions,
) => string;

const htmlTags = [
    'a',
    'abbr',
    'acronym',
    'address',
    'area',
    'article',
    'aside',
    'audio',
    'b',
    'bdi',
    'bdo',
    'big',
    'blink',
    'blockquote',
    'body',
    'br',
    'button',
    'canvas',
    'caption',
    'center',
    'cite',
    'code',
    'col',
    'colgroup',
    'content',
    'data',
    'datalist',
    'dd',
    'decorator',
    'del',
    'details',
    'dfn',
    'dialog',
    'dir',
    'div',
    'dl',
    'dt',
    'element',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'font',
    'footer',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hgroup',
    'hr',
    'html',
    'i',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'map',
    'mark',
    'marquee',
    'menu',
    'menuitem',
    'meter',
    'nav',
    'nobr',
    'ol',
    'optgroup',
    'option',
    'output',
    'p',
    'picture',
    'pre',
    'progress',
    'q',
    'rp',
    'rt',
    'ruby',
    's',
    'samp',
    'section',
    'select',
    'shadow',
    'small',
    'source',
    'spacer',
    'span',
    'strike',
    'strong',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'template',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'track',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
    'iframe',
    'style',
];

const svgTags = [
    'svg',
    'altglyph',
    'altglyphdef',
    'altglyphitem',
    'animatecolor',
    'animatemotion',
    'animatetransform',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'filter',
    'font',
    'g',
    'glyph',
    'glyphref',
    'hkern',
    'image',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'stop',
    'switch',
    'symbol',
    'text',
    'textpath',
    'title',
    'tref',
    'tspan',
    'view',
    'vkern',
    'animate',
    'use',
];

const htmlAttrs = [
    'accept',
    'action',
    'align',
    'alt',
    'autocapitalize',
    'autocomplete',
    'autopictureinpicture',
    'autoplay',
    'background',
    'bgcolor',
    'border',
    'capture',
    'cellpadding',
    'cellspacing',
    'checked',
    'cite',
    'class',
    'clear',
    'color',
    'cols',
    'colspan',
    'controls',
    'controlslist',
    'coords',
    'crossorigin',
    'datetime',
    'decoding',
    'default',
    'dir',
    'disabled',
    'disablepictureinpicture',
    'disableremoteplayback',
    'download',
    'draggable',
    'enctype',
    'enterkeyhint',
    'face',
    'for',
    'headers',
    'height',
    'hidden',
    'high',
    'href',
    'hreflang',
    'id',
    'inputmode',
    'integrity',
    'ismap',
    'kind',
    'label',
    'lang',
    'list',
    'loading',
    'loop',
    'low',
    'max',
    'maxlength',
    'media',
    'method',
    'min',
    'minlength',
    'multiple',
    'muted',
    'name',
    'nonce',
    'noshade',
    'novalidate',
    'nowrap',
    'open',
    'optimum',
    'pattern',
    'placeholder',
    'playsinline',
    'poster',
    'preload',
    'pubdate',
    'radiogroup',
    'readonly',
    'rel',
    'required',
    'rev',
    'reversed',
    'role',
    'rows',
    'rowspan',
    'spellcheck',
    'scope',
    'selected',
    'shape',
    'size',
    'sizes',
    'span',
    'srclang',
    'start',
    'src',
    'srcset',
    'step',
    'style',
    'summary',
    'tabindex',
    'title',
    'translate',
    'type',
    'usemap',
    'valign',
    'value',
    'width',
    'xmlns',
    'slot',
    'frameborder',
    'scrolling',
    'allow',
    'target',
    'attributeName',
    'aria-hidden',
    'referrerpolicy',
    'aria-describedby',
    'data-*',
    'wide-content',
    'sticky-header',
];

const svgAttrs = [
    'viewBox',
    'accent-height',
    'accumulate',
    'additive',
    'alignment-baseline',
    'ascent',
    'attributename',
    'attributetype',
    'azimuth',
    'basefrequency',
    'baseline-shift',
    'begin',
    'bias',
    'by',
    'class',
    'clip',
    'clippathunits',
    'clip-path',
    'clip-rule',
    'color',
    'color-interpolation',
    'color-interpolation-filters',
    'color-profile',
    'color-rendering',
    'cx',
    'cy',
    'd',
    'dx',
    'dy',
    'diffuseconstant',
    'direction',
    'display',
    'divisor',
    'dur',
    'edgemode',
    'elevation',
    'end',
    'fill',
    'fill-opacity',
    'fill-rule',
    'filter',
    'filterunits',
    'flood-color',
    'flood-opacity',
    'font-family',
    'font-size',
    'font-size-adjust',
    'font-stretch',
    'font-style',
    'font-variant',
    'font-weight',
    'fx',
    'fy',
    'g1',
    'g2',
    'glyph-name',
    'glyphref',
    'gradientunits',
    'gradienttransform',
    'height',
    'href',
    'id',
    'image-rendering',
    'in',
    'in2',
    'k',
    'k1',
    'k2',
    'k3',
    'k4',
    'kerning',
    'keypoints',
    'keysplines',
    'keytimes',
    'lang',
    'lengthadjust',
    'letter-spacing',
    'kernelmatrix',
    'kernelunitlength',
    'lighting-color',
    'local',
    'marker-end',
    'marker-mid',
    'marker-start',
    'markerheight',
    'markerunits',
    'markerwidth',
    'maskcontentunits',
    'maskunits',
    'max',
    'mask',
    'media',
    'method',
    'mode',
    'min',
    'name',
    'numoctaves',
    'offset',
    'operator',
    'opacity',
    'order',
    'orient',
    'orientation',
    'origin',
    'overflow',
    'paint-order',
    'path',
    'pathlength',
    'patterncontentunits',
    'patterntransform',
    'patternunits',
    'points',
    'preservealpha',
    'preserveaspectratio',
    'primitiveunits',
    'r',
    'rx',
    'ry',
    'radius',
    'refx',
    'refy',
    'repeatcount',
    'repeatdur',
    'restart',
    'result',
    'rotate',
    'scale',
    'seed',
    'shape-rendering',
    'specularconstant',
    'specularexponent',
    'spreadmethod',
    'startoffset',
    'stddeviation',
    'stitchtiles',
    'stop-color',
    'stop-opacity',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke',
    'stroke-width',
    'style',
    'surfacescale',
    'systemlanguage',
    'tabindex',
    'targetx',
    'targety',
    'transform',
    'text-anchor',
    'text-decoration',
    'text-rendering',
    'textlength',
    'type',
    'u1',
    'u2',
    'unicode',
    'values',
    'viewbox',
    'visibility',
    'version',
    'vert-adv-y',
    'vert-origin-x',
    'vert-origin-y',
    'width',
    'word-spacing',
    'wrap',
    'writing-mode',
    'xchannelselector',
    'ychannelselector',
    'x',
    'x1',
    'x2',
    'xmlns',
    'y',
    'y1',
    'y2',
    'z',
    'zoomandpan',
    'from',
    'to',
    'xlink:href',
    'use',
];

const defaultCssWhitelist = {
    ...cssfilter.whiteList,
    '--method': true,
};

const yfmHtmlAttrs = ['note-type', 'term-key'];

const allowedTags = Array.from(
    new Set([...htmlTags, ...svgTags, ...sanitizeHtml.defaults.allowedTags]),
);
const allowedAttributes = Array.from(new Set([...htmlAttrs, ...svgAttrs, ...yfmHtmlAttrs]));

// For hrefs within "use" only allow local links to ids that start with "#"
const useTagTransformer = (tagName: string, attribs: Attributes): Tag => {
    const cleanHref = (href: string) => {
        if (href.startsWith('#')) {
            return href;
        } else {
            return null;
        }
    };
    const cleanAttrs = (attrs: Attributes): Attributes => {
        const HREF_ATTRIBUTES = ['xlink:href', 'href'];
        return Object.fromEntries(
            Object.entries(attrs)
                .map(([key, value]) => {
                    if (HREF_ATTRIBUTES.includes(key)) {
                        return [key, cleanHref(value)];
                    }
                    return [key, value];
                })
                .filter(([_, value]) => value !== null),
        );
    };
    return {
        tagName,
        attribs: cleanAttrs(attribs),
    };
};

export interface SanitizeOptions extends sanitizeHtml.IOptions {
    cssWhiteList?: CssWhiteList;
    disableStyleSanitizer?: boolean;
}

export const defaultParseOptions = {
    lowerCaseAttributeNames: false,
};

export const defaultOptions: SanitizeOptions = {
    ...sanitizeHtml.defaults,
    allowedTags,
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': allowedAttributes,
    },
    allowedSchemesAppliedToAttributes: [
        ...sanitizeHtml.defaults.allowedSchemesAppliedToAttributes,
        'xlink:href',
        'from',
        'to',
    ],
    allowVulnerableTags: true,
    parser: defaultParseOptions,
    cssWhiteList: defaultCssWhitelist,
    transformTags: {
        use: useTagTransformer,
    },
};

// dangerous patterns
const DANGEROUS_TAGS_RE =
    /<\s*(script|iframe|object|embed|svg|img|video|audio|link|meta|base|form|style|template|math|foreignobject)\b/i;
const CLOSE_STYLE_RE = /<\s*\/\s*style/i;
const DANGEROUS_URL_RE =
    /url\s*\(\s*['"]?\s*(?:javascript:|vbscript:|data\s*:\s*(?:text\/html|application\/xhtml\+xml|image\/svg\+xml))/i;
const IE_EXPR_RE = /expression\s*\(/i;
const IE_BEHAVIOR_RE = /behavior\s*:/i;
const MOZ_BINDING_RE = /-moz-binding\s*:/i;
const AT_RULES_RE = /@(?:import|charset|namespace)\b/i;
const COMMENTS_RE = /\/\*[^]*?\*\//g; // CSS comments: /* ... */

// control characters (C0/C1) and BiDi override characters that can hide malicious content
const CTRL_BIDI_RE = new RegExp(
    [
        String.raw`[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]`, // C0/C1 controls
        String.raw`[\u202A-\u202E\u2066-\u2069]`, // BiDi overrides
    ].join('|'),
    'g',
);

const SAFE_VALUE_FAST_CHECK_RE = /[<&\\/]|@|url\s*\(|expression|behavior|-moz-binding/i;

// backslash (CSS escapes), ampersand (HTML entities), BiDi overrides
const FAST_PATH_RE = /[\\&\u202A-\u202E\u2066-\u2069]/;

// combined regex for decoding CSS escapes and HTML entities
const RE_DECODE = new RegExp(
    [
        String.raw`\\([0-9A-Fa-f]{1,6})\s?`, // CSS hex escapes: \41 or \000041  → 'A'
        String.raw`&#x([0-9A-Fa-f]{1,6});`, // HTML hex entities: &#x41; or &#X41; → 'A'
        String.raw`&#(\d{1,7});`, // HTML decimal entities: &#65; → 'A'
        String.raw`&([a-zA-Z][a-zA-Z0-9]{1,31});`, // HTML named entities: &lt; or &amp; → '<' or '&'
    ].join('|'),
    'g',
);

const htmlEntities: Record<string, string> = {
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    amp: '&',
    newline: '\n',
    tab: '\t',
    colon: ':',
    sol: '/',
    lpar: '(',
    rpar: ')',
};

// Decodes a single escaped or encoded token
function decodeToken(
    whole: string,
    cssHex?: string,
    htmlHex?: string,
    htmlDec?: string,
    named?: string,
): string {
    if (cssHex) {
        return String.fromCodePoint(parseInt(cssHex, 16) || 0);
    }
    if (htmlHex) {
        return String.fromCodePoint(parseInt(htmlHex, 16) || 0);
    }
    if (htmlDec) {
        return String.fromCodePoint(parseInt(htmlDec, 10) || 0);
    }
    if (named) {
        const rep = htmlEntities[named] ?? htmlEntities[named.toLowerCase()];
        if (rep) {
            return rep;
        }
    }
    return whole;
}

// Normalize CSS value by decoding HTML entities and CSS escapes
function normalizeCssValue(value: string): string {
    let normalized = String(value ?? '');

    // early-exit if no special chars
    if (!FAST_PATH_RE.test(normalized)) {
        return normalized;
    }

    // 1. remove CSS comments to prevent hiding escapes inside /* ... */
    // 2. strip control characters and BiDi overrides
    // 3. decode all CSS escapes and HTML entities in one pass
    normalized = normalized
        .replace(COMMENTS_RE, '')
        .replace(CTRL_BIDI_RE, '')
        .replace(RE_DECODE, decodeToken);

    // unicode normalization (NFKC) to prevent homograph attacks
    try {
        normalized = normalized.normalize('NFKC');
    } catch {
        // silent fail: logging the value could expose sensitive data
    }

    return normalized;
}

// checks if a CSS value is safe from XSS attacks
function isSafeCssValue(property: string, value: string): boolean {
    const prop = property.toLowerCase();
    const isContentProperty = prop === 'content';

    // normalize first to prevent bypasses via comments/escapes
    const normalized = normalizeCssValue(value);

    // early-exit for trivial safe values
    if (!SAFE_VALUE_FAST_CHECK_RE.test(normalized)) {
        return true;
    }

    // сheck if normalized value looks like an HTML tag
    const looksLikeTag = /<[^>]{0,128}>/i.test(normalized);

    const dangerousPatterns = [
        looksLikeTag && CLOSE_STYLE_RE, // </style> tag closure
        !isContentProperty && looksLikeTag && DANGEROUS_TAGS_RE, // dangerous HTML tags
        DANGEROUS_URL_RE, // javascript:, data:, vbscript: URLs
        IE_EXPR_RE, // IE expression()
        IE_BEHAVIOR_RE, // IE behavior:
        MOZ_BINDING_RE, // FF -moz-binding
        AT_RULES_RE, // @import, @charset, @namespace
    ].filter(Boolean) as RegExp[];

    return !dangerousPatterns.some((pattern) => pattern.test(normalized));
}

function sanitizeStyleTags(dom: cheerio.CheerioAPI, cssWhiteList: CssWhiteList) {
    const styleTags = dom('style');

    styleTags.each((_index, element) => {
        const styleText = dom(element).text();

        try {
            const parsedCSS = css.parse(styleText);

            if (!parsedCSS.stylesheet) {
                return;
            }

            parsedCSS.stylesheet.rules = parsedCSS.stylesheet.rules.filter(
                (rule: css.Rule) => rule.type === 'rule',
            );

            parsedCSS.stylesheet.rules.forEach((rule: css.Rule) => {
                if (!rule.declarations) {
                    return;
                }

                rule.declarations = rule.declarations.filter((declaration: css.Declaration) => {
                    if (!declaration.property || !declaration.value) {
                        return false;
                    }

                    const prop = String(declaration.property).toLowerCase();
                    const val = String(declaration.value);

                    if (!isSafeCssValue(prop, val)) {
                        return false;
                    }

                    const isWhiteListed = Boolean(cssWhiteList[prop]);

                    if (isWhiteListed) {
                        declaration.value = cssfilter.safeAttrValue(prop, val);
                    }

                    if (!declaration.value) {
                        return false;
                    }

                    return isWhiteListed;
                });
            });

            dom(element).text(css.stringify(parsedCSS));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `${error}`;
            log.warn(`Failed to parse CSS in style attribute: ${errorMessage}`);
            dom(element).remove();
        }
    });
}

function sanitizeStyleAttrs(dom: cheerio.CheerioAPI, cssWhiteList: CssWhiteList) {
    const options = {
        whiteList: cssWhiteList,
    };
    const cssSanitizer = new cssfilter.FilterCSS(options);

    dom('*').each((_index, element) => {
        const styleAttrValue = dom(element).attr('style');

        if (!styleAttrValue) {
            return;
        }

        dom(element).attr('style', cssSanitizer.process(styleAttrValue));
    });
}

export function sanitizeStyles(html: string, options: SanitizeOptions) {
    const cssWhiteList = options.cssWhiteList || {};

    const $ = cheerio.load(html);

    sanitizeStyleTags($, cssWhiteList);
    sanitizeStyleAttrs($, cssWhiteList);

    const styles = $('head').html() || '';
    const content = $('body').html() || '';

    return styles + content;
}

export function sanitize(
    html: string,
    options?: SanitizeOptions,
    additionalOptions?: SanitizeOptions,
) {
    const sanitizeOptions = options || defaultOptions;

    if (additionalOptions?.cssWhiteList) {
        sanitizeOptions.cssWhiteList = {
            ...sanitizeOptions.cssWhiteList,
            ...additionalOptions.cssWhiteList,
        };
    }

    const needToSanitizeStyles = !(sanitizeOptions.disableStyleSanitizer ?? false);

    const modifiedHtml = needToSanitizeStyles ? sanitizeStyles(html, sanitizeOptions) : html;

    return sanitizeHtml(modifiedHtml, sanitizeOptions);
}

export default sanitize;

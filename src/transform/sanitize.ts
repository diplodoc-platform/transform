import type {Attributes, Tag} from 'sanitize-html';
import type {CssWhiteList} from './typings';
import type {
    Document as Parse5Document,
    Element as Parse5Element,
    Node as Parse5Node,
    ParentNode as Parse5ParentNode,
    Template as Parse5Template,
    TextNode as Parse5TextNode,
} from 'parse5/dist/tree-adapters/default';

import sanitizeHtml from 'sanitize-html';
// @ts-ignore
import cssfilter from 'cssfilter';
import * as parse5 from 'parse5';
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

function isElement(node: Parse5Node): node is Parse5Element {
    return (node as Parse5Element).tagName !== undefined;
}

function traverse(node: Parse5Node, cb: (n: Parse5Node) => void) {
    cb(node);
    const parent = node as Parse5ParentNode;
    if (parent.childNodes) {
        for (const child of parent.childNodes) {
            traverse(child, cb);
        }
    }
    const template = node as Parse5Template;
    if (template.content) {
        traverse(template.content, cb);
    }
}

function findElement(root: Parse5Document, tag: string): Parse5Element | null {
    let found: Parse5Element | null = null;
    traverse(root, (n) => {
        if (!found && isElement(n) && n.tagName === tag) {
            found = n;
        }
    });
    return found;
}

function serializeInner(node: Parse5ParentNode): string {
    return node.childNodes.map((child) => parse5.serializeOuter(child)).join('');
}

function sanitizeStyleTags(root: Parse5Document, cssWhiteList: CssWhiteList) {
    const styleTags: Parse5Element[] = [];
    traverse(root, (node) => {
        if (isElement(node) && node.tagName === 'style') {
            styleTags.push(node);
        }
    });

    styleTags.forEach((element) => {
        const styleText = element.childNodes
            .filter((n) => n.nodeName === '#text')
            .map((n) => (n as Parse5TextNode).value)
            .join('');

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

                    const isWhiteListed = cssWhiteList[declaration.property];

                    if (isWhiteListed) {
                        declaration.value = cssfilter.safeAttrValue(
                            declaration.property,
                            declaration.value,
                        );
                    }

                    if (!declaration.value) {
                        return false;
                    }

                    return isWhiteListed;
                });
            });

            element.childNodes = [
                {
                    nodeName: '#text',
                    value: css.stringify(parsedCSS),
                    parentNode: element,
                } as Parse5TextNode,
            ];
        } catch (error) {
            if (element.parentNode) {
                element.parentNode.childNodes = element.parentNode.childNodes.filter(
                    (n) => n !== element,
                );
            }

            const errorMessage = error instanceof Error ? error.message : `${error}`;
            log.info(errorMessage);
        }
    });
}

function sanitizeStyleAttrs(root: Parse5Document, cssWhiteList: CssWhiteList) {
    const options = {
        whiteList: cssWhiteList,
    };
    const cssSanitizer = new cssfilter.FilterCSS(options);
    traverse(root, (node) => {
        if (isElement(node)) {
            const styleAttr = node.attrs.find((a) => a.name === 'style');
            if (!styleAttr) {
                return;
            }
            styleAttr.value = cssSanitizer.process(styleAttr.value);
            if (!styleAttr.value) {
                node.attrs = node.attrs.filter((a) => a !== styleAttr);
            }
        }
    });
}

export function sanitizeStyles(html: string, options: SanitizeOptions) {
    const cssWhiteList = options.cssWhiteList || {};

    const document = parse5.parse(html);

    sanitizeStyleTags(document, cssWhiteList);
    sanitizeStyleAttrs(document, cssWhiteList);

    const head = findElement(document, 'head');
    const body = findElement(document, 'body');

    const styles = head ? serializeInner(head) : '';
    const content = body ? serializeInner(body) : '';

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

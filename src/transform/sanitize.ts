import sanitizeHtml from 'sanitize-html';
// @ts-ignore
import cssfilter from 'cssfilter';
import * as cheerio from 'cheerio';
import css from 'css';

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

export type CssWhiteList = {[property: string]: boolean};

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
    allowVulnerableTags: true,
    parser: defaultParseOptions,
    cssWhiteList: defaultCssWhitelist,
};

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

            dom(element).text(css.stringify(parsedCSS));
        } catch {}
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

function sanitizeStyles(html: string, options: SanitizeOptions) {
    const cssWhiteList = options.cssWhiteList || {};

    const $ = cheerio.load(html);

    sanitizeStyleTags($, cssWhiteList);

    sanitizeStyleAttrs($, cssWhiteList);

    const styles = $('head').html() || '';
    const content = $('body').html() || '';

    return styles + content;
}

export default function sanitize(html: string, options?: SanitizeOptions) {
    const sanitizeOptions = options || defaultOptions;

    const needToSanitizeStyles = !(sanitizeOptions.disableStyleSanitizer ?? false);

    const modifiedHtml = needToSanitizeStyles ? sanitizeStyles(html, sanitizeOptions) : html;

    return sanitizeHtml(modifiedHtml, sanitizeOptions);
}

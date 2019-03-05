const path = require('path');
const fs = require('fs');

const yfmStyles = fs.readFileSync(path.join(__dirname, '../dist/css/yfm.min.css'));
const yfmJS = fs.readFileSync(path.join(__dirname, '../dist/js/yfm.min.js'));

function styledHtml(html, meta) {
    return `
<!doctype html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>${meta.title || ''}</title>
    <style>
        ${yfmStyles}
    </style>
    <style>
        .markdown-body {
            margin: 0 auto;
            min-width: 200px;
            max-width: 980px;
            padding: 45px;
        }
    </style>
</head>
<body class="markdown-body yfm">
    ${html}
    <script>
        ${yfmJS}
    </script>
</body>
</html>
    `.trim();
}

module.exports = styledHtml;

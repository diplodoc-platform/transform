export function generateHTML({env, jspath, csspath} = {}) {
    if (!env) {
        env = 'development';
    }

    if (!jspath) {
        jspath = 'index.js';
    }

    if (!csspath) {
        csspath = 'index.css';
    }

    return `\
<!doctype html>
<html lang="en">
    <head>
        <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-D84DCCD2');</script>
        <!-- End Google Tag Manager -->
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>playground</title>${
            env === 'development'
                ? `
        <script>
            new EventSource('/esbuild').addEventListener('change', () => {
                location.reload();
            });
        </script>`
                : ''
        }
        <link rel="stylesheet" type="text/css" href="${csspath}"/>
    </head>
    <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <!-- Google Tag Manager (noscript) -->
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-D84DCCD2"
        height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
        <!-- End Google Tag Manager (noscript) -->
        <div id="app" class="app"></div>
        <script src="${jspath}"></script>
    </body>
</html>
`;
}

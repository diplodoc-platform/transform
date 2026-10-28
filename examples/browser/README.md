# Browser example

Use a Transform version that includes the new browser exports. The repository
example self-resolves the built package; an installed application uses exactly
the same public imports.

From the Transform checkout:

```sh
npm ci --no-workspaces
npm run build
node examples/browser/build.mjs
python3 -m http.server 8080 --directory build/browser-example
```

Open `http://localhost:8080`. The page renders notes, cuts, tabs, inline features
and escaped code with ordinary esbuild browser settings. It imports the existing
runtime and CSS explicitly. JavaScript highlighting is optional and loads through
caller-owned dynamic imports only when requested; each subsequent transformation
is synchronous. No resolver aliases, Node fallback modules, Node globals or
custom sanitizer are supplied.

For a separate application, install the candidate or released Transform package,
`esbuild`, and optional `highlight.js`, copy these three files, then run the same
build command. Serve the generated directory over HTTP so ESM chunks can load. Preserve the
example's UTF-8 declaration; classic application bundles also need correct UTF-8
serving to preserve Unicode parser data.
The application chooses trusted runtime/style bundles itself. It must not load
arbitrary metadata URLs as executable resources.

The minimal selector demonstrates the independent empty builtin composition.
Filesystem includes fail with a pre-expansion message; templates remain literal.
See [the browser migration guide](../../docs/migrations/browser-entry.md) for the
closed option contract, typed plugins and strict browser TypeScript settings.

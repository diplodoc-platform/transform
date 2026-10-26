# Diplodoc Playground

[Open the playground](https://diplodoc-platform.github.io/transform/?prefill=true).

This is the maintained playground for Diplodoc. It replaces the standalone
[diplodoc-platform/playground](https://github.com/diplodoc-platform/playground) repository.
The Split view uses the Transform build from this checkout through `@local/transform`
and `@local/transform-dist`; it does not install a separate published Transform version.

Use Node.js 24 or later. From the Transform repository root:

```sh
npm ci
npm run build
cd playground
npm ci
npm run dev
```

The development server prints its local URL. To also watch Transform sources, use
`npm run playground` from the repository root after the initial build.

Run checks from this directory:

```sh
npm run lint
npm run typecheck
npm test
npm run pages
npm run bundle
```

`pages` creates the static site in `build/`. `bundle` creates CommonJS and ESM
component bundles in `bundle/`. Generated files are not committed.
GitHub Pages publishes this playground when a Transform release is published.

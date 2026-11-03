# Migrating legacy cut, tabs and type imports

Transform 5 deprecates the public cut and tabs callbacks. Markdown syntax remains supported. Transform 6.0.0 will remove these callback entry points and the legacy `lib/typings` and `lib/plugins/typings` paths. The standard builtin plugins continue to work.

Replace a callback with a module-level factory call and pass the same options and registration order:

```ts
import {transform as createCut} from '@diplodoc/cut-extension';
import {transform as createTabs} from '@diplodoc/tabs-extension';
import type {MarkdownItPluginOpts} from '@diplodoc/transform/types';

const cut = createCut({bundle: false, directiveSyntax: 'disabled'});
const tabs = createTabs({
  bundle: false,
  features: {enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true}},
});
```

Declare the extensions as direct dependencies and retain the original `output`, `generateID` and `collect` usage. The new callbacks have different identities from the Transform preset. Check any identity-based filtering before changing imports. Normal builtin installation is silent; explicitly invoking a legacy callback with a Transform deprecation reporter emits a scoped warning. Native callers without a reporter do not receive runtime warnings. Type-only imports are erased and cannot warn at runtime.

## Source checkout migration report

The report is a repository development tool. It is not included in the published
`@diplodoc/transform` npm package. Run it from the root of a Transform 5 source
checkout, with Node.js 24 or later and npm 11.5.1 or later. Install the checkout's
dependencies, including development dependencies: the report uses TypeScript.

```sh
cd /path/to/transform
npm ci --no-workspaces
node scripts/report-legacy-imports.mjs /path/to/consumer/source.ts
```

Pass explicit consumer source files; relative paths resolve from the Transform
checkout. The command reports locations and proposes safe type-only replacements
and isolated default callback imports. Add `--write` to apply those replacements
to the explicitly listed files.

Calls that pass options, such as `md.use(cut, {directiveSyntax: 'enabled'})`, need
manual migration: preserve the selected syntax mode in the extension factory.
The report also leaves dynamic options and other callback forms unchanged for
manual migration. It does not traverse directories, update dependencies, or prove
that TypeScript editors show deprecation diagnostics.

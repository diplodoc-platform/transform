# Typed plugin configuration

Status: approved by the coordinator for implementation. Task: DOCSTOOLS-6937.

Baseline: parser migration `d674566f755d7771d8c409b28be159dcd47e9eb8`.
The accepted SVG migration is incorporated, retaining native markdown-it 15
attribute normalization and completing its direct-plugin test fixture types.

## Boundary and compatibility

The existing synchronous entrypoint, `OptionsType` index signature, callback
`plugins` array, custom option passthrough and `DefaultPlugins` export remain
supported. This change does not announce or perform their removal. It adds a
strict configuration builder and named plugin composition. Ordinary calls follow
the existing path, with unchanged plugin functions, order and shared options.

Liquid and YFMLint remain. Attr defaults, notes titles, HTML sanitization, SVG
patches, document context lifecycle and supported runtimes are not changed here.
Plugin controls govern installation, not bundle elimination or parse-rule order.

## Public API

The implementation module is `plugin-configuration.ts`. Its named functions and
types are exposed through the stable `@diplodoc/transform/configuration` entrypoint
with matching native ESM and CommonJS facades. This newly introduced module has
no historical `lib/*` compatibility alias. Internal registry helpers remain
outside the public export map.

```typescript
import {definePlugin, defineTransformOptions} from '@diplodoc/transform/configuration';

const badge = definePlugin<{label: string}>({
  id: 'example/badge',
  after: ['notes'],
  setup(md, options, context) {
    // options.label is this plugin's configuration only.
    // context contains shared path, logger, language and deprecations.
    // Rules access the existing state.env; this API creates no new lifecycle.
  },
});

const options = defineTransformOptions({
  core: {path: 'guide.md', allowHTML: false},
  plugins: {
    preset: 'default',
    disable: ['video'],
    options: {notes: {notesAutotitle: false}},
    plugins: [badge({label: 'Preview'})],
  },
});

transform(markdown, options);
```

`defineTransformOptions(configuration: TransformConfiguration): OptionsType`
accepts a closed object with `core?: TransformCoreOptions` and
`plugins?: PluginConfiguration`. It does not infer arbitrary extra option keys.
`TransformCoreOptions` has no string index signature. Legacy calls continue to
accept their existing arbitrary options. A gradual caller can pass the same
`PluginConfiguration` through `OptionsType.pluginConfiguration`.

`PluginConfiguration` contains:

- `preset?: 'default' | 'none'`, defaulting to `default`;
- `enable?: readonly BuiltinPluginId[]` and `disable?: readonly BuiltinPluginId[]`;
- `options?: BuiltinPluginSettings`, with a closed per-plugin settings map;
- `plugins?: readonly ConfiguredPlugin[]`, appended in declared order before
  resolving explicit ordering constraints.

Providing both legacy `plugins` and `pluginConfiguration` is an error, including
an explicit empty legacy array. This avoids silently ignoring either composition.
Settings for a disabled/unselected plugin are an error instead of implicit enable.

`definePlugin<Configuration>(definition)` returns a function accepting exactly
`Configuration` and producing a `ConfiguredPlugin`. A definition has a nonempty
stable `id`, `setup(md: MarkdownIt, options: Configuration,
context: PluginContext): void`, and optional readonly string arrays
`requires`, `before`, `after`. Configuration stays in a closure and is passed as
a separate argument; it is never spread into shared context. Config keys such
as `log` or `path` cannot overwrite the logger/path seen in `context`.
`PluginContext` accurately makes `path`, `root`, `rootPublicPath` and `isLintRun`
optional. Normalized `log`, `lang`, `deprecations` and `generateID` are required.
The context is readonly at the type boundary; rules still receive the existing
mutable markdown-it env. No arbitrary custom fields are promised on context.

`ConfiguredPlugin` has an ID, installation callback and ordering metadata; its
generic configuration is already bound. There is no process registry, cache,
dynamic proxy or runtime schema compiler. Definitions may add markdown-it rules
that use declaration augmentation of the existing `ParserEnv` interface. This
does not promise fresh/reset env behavior; DOCSTOOLS-6951 owns that lifecycle.

A definition can explicitly provide `collect`, preserving the same function on
the configured callback. `CollectOptions` is a separate generic argument; binding
parser options does not bind or change collection options. The helper
`defineLegacyPlugin({id, plugin, requires?, before?, after?})(configuration)`
adapts an existing callback, preserves its `.collect` identity and merges its
legacy config before normalized context. Thus normalized context wins collisions.
Default builtin callbacks are used directly, preserving any attached properties.
Neither helper executes collect during transform.

## Finite default inventory

The following IDs map one-to-one to the existing functions in `plugins.ts`, in
this order. Names do not derive from function names or markdown-it rule names.

| Order | ID             | Feature-specific settings in `BuiltinPluginSettings`                                         |
| ----- | -------------- | -------------------------------------------------------------------------------------------- |
| 1     | `meta`         | None                                                                                         |
| 2     | `deflist`      | None                                                                                         |
| 3     | `cut`          | `output?: string`                                                                            |
| 4     | `notes`        | `notesAutotitle?: boolean`                                                                   |
| 5     | `anchors`      | `supportGithubAnchors`, `disableCommonAnchors`, `useCommonAnchorButtons`: optional booleans  |
| 6     | `tabs`         | `output?: string`; ID generator remains shared context                                       |
| 7     | `code`         | `codeLineWrapping?: boolean`                                                                 |
| 8     | `sup`          | None                                                                                         |
| 9     | `video`        | Existing `VideoPluginOptions`, including `videoUrl` and all service settings                 |
| 10    | `monospace`    | None                                                                                         |
| 11    | `table`        | Existing `YfmTablePluginOptions`: four splitter flags                                        |
| 12    | `file`         | Existing companion `PluginOptions`: `output?: string`, `fileExtraAttrs?: [string, string][]` |
| 13    | `imsize`       | `enableInlineStyling?: boolean`                                                              |
| 14    | `term`         | `multilineTermDefinitions?: boolean`                                                         |
| 15    | `block-anchor` | None                                                                                         |
| 16    | `inline-code`  | None; ID generator remains shared context                                                    |
| 17    | `visibility`   | `contentAudience?: VisibilityMode`                                                           |

Video service keys are `youtube`, `vimeo`, `vine`, `prezi`, `osf`, `yandex`, `vk`,
`rutube`, `url`; each existing service configuration has width/height, and vine
also has `embed`. Existing replacement/shallow-merge semantics are retained.
Table keys are `table_ignoreSplittersInBlockCode`,
`table_ignoreSplittersInInlineCode`, `table_ignoreSplittersInBlockMath`,
`table_ignoreSplittersInInlineMath`; this task changes none of their defaults.

No-setting plugins reject arbitrary option keys. Builtin-specific settings are
merged only into that builtin's normalized shared context; a notes setting does
not reach a custom plugin or an unrelated builtin. Existing flat builtin settings
remain supported through legacy options. Mixing a corresponding legacy flat
setting with its explicitly supplied namespaced replacement is an error rather
than an undocumented precedence rule. Unrelated legacy custom keys continue to
reach legacy callbacks unchanged.

The inventory includes settings absent from today's named `OptionsType` fields:
`notesAutotitle`, video settings, all table flags, `enableInlineStyling`,
`multilineTermDefinitions`, `output`, `fileExtraAttrs`, `isLintRun`, and the
default included preprocessor's `included` flag. Type extraction must not discard
these when introducing the strict API. Legacy builtin option fields become named
types too, while the compatibility index signature remains.

## Core registrations and options

These four registrations happen before `DefaultPlugins` and remain core
infrastructure without selectable builtin IDs:

| Registration           | Existing control and behavior                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `markdown-it-attrs`    | Installed only when `enableMarkdownAttrs === true`; uses `leftDelimiter` and `rightDelimiter`                   |
| `olAttrConversion`     | Always installed; converts ordered-list start to CSS custom property and extends the permitted style properties |
| `inlineSvgMarker`      | Always installed; removes internal SVG markers during block/inline parsing                                      |
| `linkifyStrikethrough` | Always installs replacement `linkify` rule; effect remains governed by `linkify` and `disableRules`             |

`preset: 'none'` means no selection from the seventeen default feature plugins.
It is not raw markdown-it and does not disable these registrations, preprocessors,
Liquid, highlighter or sanitization. Existing flags still control those features.
In particular, attributes retain their current default until DOCSTOOLS-6944.

`TransformCoreOptions` explicitly retains existing parser/output/environment
settings: log, compatibility, tokens, vars, path, extractTitle, needTitle,
allowHTML, linkify, linkifyTlds, breaks, conditionsInCode, disableLiquid,
leftDelimiter, rightDelimiter, isLiquided, needToSanitizeHtml, sanitizeOptions,
sanitize, needFlatListHeadings, preprocessors, highlightLangs, disableRules,
root, rootPublicPath, transformLink, getPublicPath, renderInline, cache,
enableMarkdownAttrs, lang, generateID, isLintRun and included.
Existing optional-plugin callback/configuration fields already named in
`OptionsType` (extractChangelogs, svgMaxEntityCount, svgInline, inlineSvg after
its landed migration, rawContent, calcPath, replaceImageSrc) remain named and
available; this work does not narrow their callback contracts accidentally.

## Optional modules and real ordering constraints

Optional `includes`, `images`, `links`, `changelog` and `checkbox` modules remain
outside the default registry. Authors may wrap their existing callbacks in typed
definitions or use the unchanged legacy `plugins` array. This task neither adds
defaults nor changes collect hooks. Their option inventory includes:

- includes: the existing `GetFileTokensOpts`, `notFoundCb`, `noReplaceInclude`;
- images: existing SVG controls, `assetsPublicPath`, `notFoundCb`, `rawContent`,
  `calcPath`, `replaceImageSrc`, file/path/resource settings;
- links: `transformLink`, `notFoundCb`, `needSkipLinkFn`, `getPublicPath`,
  `skipLinkFileCheck`, existing file-token options;
- changelog: `extractChangelogs`;
- checkbox: `idPrefix`, `divClass`, `disabled`.

`collect` operations keep their existing separate contracts and legacy function
references. The new composition interface is specifically a transform/parser
installation interface; it must not claim to configure CLI collect execution.

No hard dependency between two selected default plugins was found. Rule
registration uses standard markdown-it anchors, or explicit fallbacks when an
optional rule is absent. In particular, notes/block-anchor try before attrs;
anchors prefers after attrs/includes; term prefers before includes; images prefers
before includes. These are rule-registration behaviors, not a reason to invent
mandatory feature dependencies. The four core registrations stay before features.

Without explicit custom constraints, installation preserves the current default
order and custom descriptor array order. Explicit `requires` means the named
plugin must be selected and installed first. `before`/`after` also require their
targets to be selected, and constrain installation only. Ordering traverses the original selected sequence and installs each unmet
predecessor immediately before its dependent, traversing multiple predecessors in
the same original sequence order. This preserves builtin relative order when a
custom plugin is inserted before a builtin, rather than moving unrelated
builtins ahead of the blocked builtin.
Enabled builtins retain their historical relative order. If explicit custom
constraints force builtin reordering, configuration fails with the conflicting
builtin IDs; for example, a plugin requiring `file` but preceding `meta` is
rejected. This is an installation-order invariant, not a semantic dependency
between features. Authors remain responsible for markdown-it rule ordering
inside their setup callback.

Duplicate IDs (including shadowing a builtin), invalid preset/unknown builtin
IDs, contradictory enable/disable lists, missing dependency or ordering targets,
self-reference and cycles fail before any selected feature setup runs. Errors
name the relevant IDs/edge. Dependency failure does not silently auto-enable a
plugin. Empty presets still allow explicitly enabled builtin IDs.

## Acceptance fixtures

- Full existing suite and deterministic output parity between ordinary transform
  and an explicit default configuration. Default function identities/order match
  the old `DefaultPlugins` list.
- Every builtin can be independently deselected and selected from `none`, with
  representative parsing/renderer effects and registry checks for trivial modules.
- Core registrations and sanitization remain effective with `none`; HTML/script,
  SVG marker, ordered-list and linkify regression fixtures guard this boundary.
- Custom option objects remain isolated between plugins, cannot overwrite core
  context and receive normalized diagnostics. Legacy arbitrary option passthrough,
  callback list order and collect function references remain unchanged.
- A pathless ordinary call reaches custom setup with undefined path/root fields;
  a negative compiler fixture forbids treating them as guaranteed strings.
- Positive strict type fixtures for every previously unnamed builtin setting,
  video service shape, file attrs, custom callback options and env augmentation.
- Negative compiler fixtures: unknown core key; wrong builtin ID, key or value;
  wrong custom option key/type; cross-plugin option access; legacy/new composition
  collision where representable. Use compiler diagnostics, not only runtime casts.
- Runtime fixtures for all metadata errors, stable ordering, missing enabled
  dependencies, cycles, per-builtin settings isolation and configuration conflicts.
- Build and install the actual tarball with exact compatible registry companions;
  verify native imports/declarations and custom configuration from outside the
  workspace. Record companion versions and integrity values. Initial 2026-10-27
  acceptance used isolated local tarballs; subsequent fresh registry-only
  `npm ci` and installed-package checks passed with file `0.2.7-transform5.0`,
  tabs `3.10.8-transform5.0`, and utils `2.3.7-transform5.0`, without local
  overrides or peer resolution flags.
- A real CLI migration fixture and representative custom extension must exercise
  this configuration. Passing transform-only mocks does not complete task 6937.

Consumer adaptations remain on their separate branches. Publication and old-API
removal are outside this proposal. Full CI, consumer acceptance and coordinator
reviews remain necessary before a child PR can merge into the major branch.

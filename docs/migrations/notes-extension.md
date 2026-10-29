# Notes extension

Transform keeps notes enabled in its standard composition. The implementation now
comes from `@diplodoc/notes-extension`; existing `/plugins/notes` and retained
`lib/plugins/notes` imports continue to delegate to it. Existing notes syntax,
Russian fallback, all 16 languages, automatic titles, explicit titles and explicit
empty titles are preserved. `notesAutotitle:false` retains its existing meaning.

Applications that own a MarkdownIt callback list can use the public pure entry:

```typescript
import {createNotesPlugin} from '@diplodoc/notes-extension/plugin';

const notes = createNotesPlugin((path) => path);
md.use(notes, {lang: 'en', notesAutotitle: false});
```

Supply the application's existing path formatter when preserving formatted
terminal diagnostics. The pure callback has no asset copying or resource metadata
side effects. It fits hosts such as CLI and Translation that already choose their
callback list and bundle Transform styles. Keep Translation's explicit
`notesAutotitle:false` setting when replacing its retained Transform callback.
Do not replace the rest of those applications' include, link or image callbacks.

Standalone applications can instead use the package's Node `transform()` factory
with its typed `collect()` and explicit resources, or its `/browser` factory.
See the package README for those separate resource contracts. Avoid importing the
standalone compiled notes stylesheet when Transform already provides the same CSS.

Transform's existing compiled style exports retain notes at the same cascade
positions, including print. Existing public Sass paths use the canonical package
mixins through the standard `pkg:` importer. Enable Sass's `NodePackageImporter`
when compiling those Sass sources; Transform's own build does so. This needs no
application resolver alias. Compiled CSS consumers keep their existing imports.

This extraction does not remove retained Transform paths or disable automatic
note titles. Removal follows the separate deprecation policy. The prerelease
package is used for major-version validation; stable release adoption is a
separate step.

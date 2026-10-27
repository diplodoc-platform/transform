# ADR-011: Migrate inlineSvg to svgInline.enabled

Status: Accepted for the Transform 5 development branch.

Task: [DOCSTOOLS-6947](https://st.yandex-team.ru/DOCSTOOLS-6947).

## Decision

Use `svgInline.enabled` to configure SVG inlining. Keep `inlineSvg` as a deprecated
boolean alias during the Transform 5 transition and warn when it is supplied.
If both settings specify a boolean, the modern `svgInline.enabled` takes priority,
including an explicit `false`. Previously the legacy alias unconditionally won.

The normalization order is:

1. Explicit `svgInline.enabled`.
2. Explicit `inlineSvg` when the modern enabled field is omitted.
3. The existing default, `true`.

An `undefined` value is treated as omitted. This rule applies to ordinary
Transform calls and direct registration of the images plugin. Normalization runs
before Transform injects defaults, then the images plugin uses the same pure
normalizer for direct callers. It never modifies the caller's configuration or
nested `svgInline` object.

The public `SvgInlineOptions` type defines optional `enabled` and `maxFileSize`
fields. Both public Transform options and plugin options use this type; callers
may now provide only the field they need. Missing `maxFileSize` uses the existing
2 MiB default, including when an object only supplies `enabled`. An explicit
`maxFileSize: 0` remains zero. Other custom plugin options pass through unchanged.

## Migration

Before:

```typescript
transform(markdown, {inlineSvg: false});
```

After:

```typescript
transform(markdown, {svgInline: {enabled: false}});
```

Keep any explicit limit alongside the new enabled field:

```typescript
transform(markdown, {
  svgInline: {enabled: true, maxFileSize: 1024 * 1024},
});
```

Remove the old field even when a modern field is also present. For example,
`{inlineSvg: true, svgInline: {enabled: false}}` disables automatic inlining and
warns about `inlineSvg`.

The image attribute `{inline=true}` continues to force SVG inlining even when
automatic inlining is disabled or the file exceeds `maxFileSize`.
`{inline=false}` continues to prevent inlining. SVG entity limits, ID generation,
sanitization, image attributes and fallback behavior retain their existing
contracts. A file at the configured size limit is allowed; a larger file remains
an image reference unless explicitly forced inline.

## Warning and scope

The images plugin reports actual legacy option use through ADR-009's shared
reporter, with stable code `TRANSFORM_INLINE_SVG`, option name `inlineSvg`, source
path when available, replacement `svgInline.enabled`, and removal version
`6.0.0`. A legacy `false` triggers the same warning as `true`; supplying only
modern settings does not warn. Configuring the old alias still warns if the
modern field takes priority. The plugin emits this configuration diagnostic when
parsing, even if the particular document contains no SVG image.

Transform supplies one shared reporter to its plugins and preprocessors. Repeated
images or parses in that scope do not repeat the configuration warning. Separate
ordinary Transform calls re-emit through an injected logger, even when the logger
is reused. Direct images-plugin registration reuses a supplied reporter or creates
one reporter for that registration. An explicitly supplied reporter can be reset
between documents/builds; the next parse then warns again. Generic logger warning
deduplication and the collected `logs.warn` format remain unchanged.

There is no feature-wide legacy switch or diagnostic suppression flag. During
the transition the alias itself supplies the old setting when the modern field
is absent. Neither value of the generic compatibility policy restores the old
conflicting-option precedence or silences this warning.

## Release sequence and verification

This implementation belongs to the Transform 5 development branch. It does not
publish a warning release on Transform 4 or remove the alias. Publish the warning
and migration guide before removal; keep the alias supported throughout the
Transform 5 transition. Removal is scheduled only for the next major, Transform
6.0.0, subject to the published-warning and consumer-migration gates in ADR-009.
Deleting the alias and its public deprecated type is a later removal task.

Regression coverage renders actual SVG through the images plugin for all nine
combinations of absent/true/false legacy and modern enabled values. It additionally
covers warning forwarding, scopes/reset, direct plugin callers, partial modern
settings, size limits including zero, forced image attributes, frozen options,
and preservation of custom plugin options. Existing SVG entity and sanitizer
regressions protect the remaining SVG behavior.

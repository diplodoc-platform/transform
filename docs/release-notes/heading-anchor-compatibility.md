# Heading anchor compatibility

This change fixes heading attributes without updating markdown-it-attrs or the
sanitizer policy.

Empty shorthand IDs such as `{# deployment-preparation}` fall back to the legacy
automatic heading URL instead of rendering an empty or numeric-only ID. Existing
automatic URLs for headings without a nonempty explicit ID remain unchanged.

Multi-word shorthand IDs such as `{#YP Service Discovery interaction}` now use
their first word (`#YP`). Previously, invalid duplicate-ID markup accidentally
preserved an automatic URL. This accepted change affects links to headings using
this form, including infra/deploy, solomon and sandbox documentation. Migrate links
or replace the source with an explicit single-word `{#section-id}`.

Heading text, accessible anchor labels and headings/TOC titles no longer retain
whitespace left by a removed attribute block.

The anchors plugin emits a `YFM024` marker for ambiguous shorthand IDs during lint
runs. The companion yfmlint rule reports it as WARN by default. Publish both
package updates, then rebuild and release CLI with the new yfmlint: CLI bundles
the linter into its binary, so publishing yfmlint alone does not activate YFM024
in an already published CLI. Rendering fixes can propagate through the CLI's
compatible transform dependency range without that CLI rebuild.

Keep the multi-word ID URL change in the release-please PR's release notes.

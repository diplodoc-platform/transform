# Notes extraction contract

Task: [DOCSTOOLS-6942](https://st.yandex-team.ru/DOCSTOOLS-6942).
Source, installed-package and actual consumer gates pass as of 2026-10-29.
Current-head hosted checks and post-CI root reviews remain required before merge.

- The public standalone notes package owns the single grammar, title dictionaries
  and canonical Sass mixins. Transform retains typed compatibility callbacks and
  constants paths; its Node path formatter and plain browser formatting remain.
- Preserve legacy syntax, token maps, HTML, diagnostics, all 16 languages with
  Russian fallback, and automatic, explicit and empty titles. No title-default
  change or colon syntax is part of this extraction.
- The Transform bridge uses the pure package entry, so rendering adds no separate
  assets, filesystem copying or resource flags. The standard/minimal composition
  contract and strict Node/browser declarations remain unchanged.
- Preserve base, yfm-only and print cascade positions. Compare compiled CSS and
  runtime assets against the accepted browser-phase2 package. Public Sass must
  compile with the real standard NodePackageImporter as well as the real build.
- Install the genuine packed candidate in CLI, Translation, Viewer and SDK; record
  actual parser resolutions, locks, package file identity and consumer outputs.
  Prepare direct owned-callback migration for CLI and both Translation pipelines,
  preserving explicit Translation title settings and source round trips.
- Consumer adaptations stay on separate local branches. Root review, exact-head
  hosted checks and two further root reviews precede a major-branch-only merge.
  This task does not close the full major plan or remove old exports.

## Accepted consumer checkpoint

The frozen Transform archive has SHA256
`1d070d15c854557c6cd090236b09b9d56cf94f1a54dc94a2651f4e94a25e70cb`.
All 1187 installed Transform files and all 52 published notes files match their
archives in each consumer. The 14 runtime JavaScript/CSS files are byte-identical
to the accepted browser baseline. The canonical Sass source now appears in maps.

- CLI's direct pure callback retains its Node formatter, position and options.
  The final combined graph with migrated Translation and SDK passes 2994 tests
  with one skipped, typecheck, build and actual HTML, Markdown and MD-to-HTML.
- Both Translation pipelines use standalone notes. Source and target round trips,
  nested parse/failure restoration and protected XLIFF attributes pass; the full
  suite has 750 passed and four skipped. The strict native13 source boundary passes.
- Viewer passes 172 tests with three skipped and 28 snapshots, model/client/server
  types, native workers and fresh external/internal builds, SSR and browser checks.
- SDK passes 199 tests, typecheck, build and actual note lint with attrs on/off.

The complete CLI lint retains six pre-existing formatting errors. Translation's
public declaration check retains the same 22 baseline diagnostic lines; its strict
changed source boundary is checked separately without masks. A load-sensitive CLI
timing failure is retained in evidence; the final quiet run on the identical graph
passes. Viewer was exercised on macOS with local HTTP/WebSocket fixtures, which
does not establish external service connectivity or other operating systems.

Consumer code and genuine candidate locks are preserved on local branches; these
checks do not authorize their publication. The standalone notes prerelease is
published; its source master and repository visibility remain unchanged. Private
repository Dependency Review is explicitly deferred by the owner and must be rerun
after the owner enables the public repository. It is not reported as a passed scan.

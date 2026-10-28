# Notes extraction contract

Task: [DOCSTOOLS-6942](https://st.yandex-team.ru/DOCSTOOLS-6942).
Source implementation and installed-package gates pass; actual CLI, Translation
and Viewer migration gates remain pending at this checkpoint.

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

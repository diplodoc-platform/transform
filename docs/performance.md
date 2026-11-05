# Manual performance regression suite

Run `npm run test:performance -- --help` for the manual command.

This suite measures installed Transform 5 packages through their public APIs. It is
manual: default unit tests and pull-request CI do not execute it. Keep deterministic
operation-count checks in focused unit tests; wall-clock limits belong here.

## Prepare and run

Use two already built, installed package directories with their own installed
production dependencies. Both execute under the runner's exact Node executable.
Do not compare a source checkout with a packed candidate and call that release proof.
For release acceptance, use two separately installed npm archives and retain their
lockfiles. Installation and package builds are explicit preparation steps outside
the benchmark. The runner does not download packages or run lifecycle scripts.

```sh
node scripts/performance/run.mjs \
  --baseline /absolute/baseline/node_modules/@diplodoc/transform \
  --candidate /absolute/candidate/node_modules/@diplodoc/transform \
  --out /absolute/results/transform-comparison
```

Trusted local `.tgz`/`.tar.gz` npm archives are also accepted. Supply
`--dependencies /absolute/installed/node_modules`; the runner extracts only regular
files/directories under `package/`, then links that existing dependency directory.
The supplied directory must contain all required dependencies, including packages
that an npm install might otherwise nest beneath Transform. A consumer root
`node_modules` alone may therefore be incomplete. This mode intentionally uses one
explicit dependency set for both archives. Compare
installed directories when dependency versions differ. Archive bytes are hashed.
The output directory must not exist, preventing accidental overwrite of evidence.
Without `--out`, results go into a timestamped system temporary directory.

```sh
node scripts/performance/run.mjs --baseline baseline.tgz --candidate candidate.tgz \
  --dependencies /absolute/fixture/node_modules --cases image-candidates,footnotes \
  --out /absolute/results/migration-comparison
```

Use `--list` to list cases, `--cases name,name` for focused runs. `--sizes N,2N`
overrides the two sizes for selected cases. Default sizes belong to each fixture:
normal documents use small realistic pages; headings/tables/includes repeat public
syntax; long-table cases include plain, inline-code, multiline-code rows and an
unmatched backtick followed by a long document; migrations use accepted and refused candidates; footnotes reach thousands
of definitions; malformed HTML and include/table/CSS whitespace probe hostile
inputs. All fixture content is generated here and contains no private documents.
Includes read a generated local snippet within the run directory.

The browser case imports the **published browser bundle under Node**, including its
real browser sanitizer/CSS adapter. It is not browser navigation, DOM rendering,
layout, or a replacement for browser E2E tests. A browser entry is required; older
packages without that entry fail explicitly rather than silently falling back.

## Measurement and decisions

Each artifact/case/size/round runs in a fresh child process, sequentially. Default:
three rounds, two warmups, five measured repetitions. Role and size order alternate
between rounds. Timing excludes package import, source generation, assertions,
hashing, and disk writes. Each measured invocation includes the complete public
transform/migration/sanitize call; Node includes perform their normal filesystem
reads. No internal regex or implementation helper is substituted for a public API.

Every measured output passes structural or safety assertions. Generated IDs use a
deterministic incrementing counter reset before each public invocation. Heading
and footnote cases verify unique IDs and resolved anchor/backlink targets.
Migration checks verify expected edits/refusals; sanitizer cases require visible text and reject
executable tags/URLs. The suite stores input and exact HTML or complete migration
results, hashes, and sizes. Outputs must remain deterministic within a child and
identical across rounds/artifacts. The latter comparison can be waived explicitly
for named cases with `--allow-output-change name,name` after reviewing saved diffs;
this does not waive correctness assertions. No output is normalized.

The report includes every raw timing, round medians, median absolute deviation
(MAD), p10/p90, and conservative bounds spanning all round medians plus two MADs.
Both baseline and candidate get an independent N-to-2N scaling check; a known bad
baseline therefore fails even if the candidate has the same defect. Candidate
versus baseline is also checked at each size. The report is intentionally a gate
on the workload contract, not a claim of statistical significance.

Defaults allow 3.0x time for doubling input and 1.5x candidate/baseline slowdown.
The conservative interval must lie wholly above a threshold to fail or wholly below
to pass. Noise (relative MAD above 20%), denominator medians below 5 ms, fewer than
three rounds/repetitions, or an interval crossing a threshold yield INCONCLUSIVE.
These generous thresholds expose large algorithmic regressions without asserting
that every acceptable workload is strictly linear. Adjust with `--max-scaling`,
`--max-slowdown`, `--max-noise`, and `--min-ms`. Threshold changes are recorded.
Increase fixture sizes or repetitions and repeat on an idle machine to resolve
inconclusive results; do not lower sample requirements to manufacture a pass.

Exit codes: **0 PASS**, **1 FAIL** (including assertion errors, timeouts, or child
crashes), **2 INCONCLUSIVE**. A failed baseline scaling check is visible separately
from candidate scaling and candidate/baseline checks. Tiny smoke runs intentionally
return INCONCLUSIVE; they only prove wiring and assertions.

`--timeout` defaults to 30000 ms per child, including import and warmup time.
`--heap-mb` defaults to 512 MiB V8 old-space per child. This is a V8 heap ceiling,
not a hard operating-system RSS limit. Reports retain peak RSS and heap usage.
Native allocations can exceed that ceiling; use an OS/container memory limit if
the acceptance environment requires a hard total-memory cap.

## Evidence and acceptance

`report.json` includes exact Node executable SHA-256, Node/component versions,
CPU/OS/memory/load metadata, artifact identity, options, samples, and checks.
Artifact manifests hash package metadata and every file under `lib`, `dist`,
and both `api`/`public` facade directories, including browser chunks. Each child
records hashes of loaded CommonJS modules, plus their actual nearest package metadata, versions, and real paths.
Available ancestor lockfiles are hashed as context and can include unrelated
metapackage locks; actual loaded-module hashes establish execution provenance.
Source/output files and stderr are kept per invocation. No environment dump, credentials, or network requests are made.
Record original package archive/lockfile hashes alongside installed-directory runs
when these are needed for release provenance; a directory hash does not prove how
that directory was installed. Package functions are executed only in benchmark
children; use trusted local artifacts.

High machine load triggers a warning. Other compiler/test/benchmark jobs and thermal
or power-management effects can distort results even below that threshold. Final
acceptance must run sequentially on an otherwise idle, consistent machine; inspect
the raw distribution and rerun noisy cases. A single green run is not proof of
production throughput or all input classes. Full CLI `mergeIncludes` corpus and
consumer integration validation remain separate release checks.

## Diagnostic, scanner and migration workloads

The manual suite also exercises a batch of ordinary root documents, opaque tables
inside directive containers, scope lookup after existing colon Notes, unproved
marker filtering, genuine refused migration proofs, and the image proof budget.
Two browser guard cases use supported `allowHTML:false` options for repeated
incomplete tags and quoted multiline include-like text. The original 17 cases and
thresholds remain unchanged. Cold deeply malformed HTML can exhaust recursive DOM
serialization in historical and current packages; that failure remains visible,
including when a smaller prior call happens to change JIT behavior. The suite does
not reduce the workload, increase the stack or treat warming as a repair.

A diagnostic sample is one whole N-root batch with unique synthetic source paths.
The compatibility collector is cleared outside the batch. The first Output remains
retained until the end, so its warning snapshot and explicit global history remain
observable. Default per-document behavior must not be replaced with an explicit
aggregate collector merely to make the workload pass. Project-owned aggregation
has intentionally retained history and belongs in a separate correctness check.

Scanner comparison needs deliberate dependency recipes and loaded-module evidence.
Controlled aligned old/new graphs isolate scanner work; physical deduplication is
not a functional requirement. Genuine 13/15 peer copies are supported when all
loaded current Directive copies contain the approved bytes and compatible host
protocol. An older module-local registry graph remains a negative control.

### Exact role oracles

`--role-oracles FILE.json` supplies reviewed exact outputs for named case/size
pairs. It does not record or approve outputs automatically. Each entry requires
both baseline and candidate files plus their SHA-256; paths resolve relative to
the manifest. Copy the saved worker JSON bytes without changing HTML, IDs,
whitespace, paths, diagnostics or ordering. Every measured output must still pass
its structural/safety assertions, be deterministic and match its own exact file.
An optional input SHA-256 binds the oracle to the generated Markdown bytes.

```json
{
  "schemaVersion": 1,
  "cases": {
    "document-log-history": {
      "250": {
        "baseline": {"file": "old-250.json", "sha256": "64 hexadecimal characters"},
        "candidate": {"file": "new-250.json", "sha256": "64 hexadecimal characters"}
      }
    }
  }
}
```

The report records the manifest and output hashes. A cross-artifact difference can
be accepted by this route only when both exact role files matched every sample;
this never waives a failed assertion, nondeterminism or scaling check. Historical
log-history/image-budget shapes are admitted only with an explicit role oracle;
without it their fixtures require the current document/budget contract. Preserve
known baseline failures separately. Ordinal repairs and other intentional changes
need their own reviewed role files; there is no global normalization or waiver.

### Blank paragraph boundaries in tables

The additive `table-paragraph-boundaries` case repeats two authored rows separated
by an unmatched backtick and a blank paragraph boundary. Every output must contain
one table, 2N rows, 4N cells and no inline code. Historical packages that pair the
backticks across the blank line fail these assertions; preserve that result as a
negative control. Do not relax the row assertions or supply a role oracle for it.
Measure the final main and future dependency-train artifacts against each other
only after both pass this correctness contract. Their N-to-2N scaling and timing
comparison cover this new workload; the original cases retain the earlier
baseline-to-candidate regression comparison.

import {readFileSync} from 'fs';
import {resolve} from 'path';
import {runInNewContext} from 'vm';
import {load} from 'js-yaml';
import {describe, expect, it} from 'vitest';

type Step = {
    name: string;
    if?: string;
    run?: string;
    uses?: string;
    with?: Record<string, string | boolean>;
    env?: Record<string, string>;
};
type Workflow = {
    permissions: {contents: string};
    jobs: Record<
        string,
        {
            name: string;
            if?: string;
            needs?: string[];
            permissions?: {contents: string};
            steps: Step[];
        }
    >;
};
const workflow = (name: string) =>
    load(readFileSync(resolve(__dirname, `../.github/workflows/${name}.yml`), 'utf8')) as Workflow;

function enabled(
    expression: string | undefined,
    author: string,
    actor = author,
    fork = false,
    branch = 'topic',
    forkOwner = 'fork',
) {
    expect(typeof expression).toBe('string');
    return Boolean(
        runInNewContext(expression || 'false', {
            github: {
                actor,
                repository: 'owner/transform',
                event: {
                    pull_request: {
                        user: {login: author},
                        head: {
                            ref: branch,
                            repo: {
                                full_name: fork ? `${forkOwner}/transform` : 'owner/transform',
                                fork,
                                owner: {login: fork ? forkOwner : 'owner'},
                            },
                        },
                    },
                },
            },
            always: () => true,
            startsWith: (value: string, prefix: string) => value.startsWith(prefix),
        }),
    );
}

describe('Dependabot workflow boundaries', () => {
    it('runs coverage tests and preserves artifacts independently of Sonar publication', () => {
        const coverage = workflow('coverage');
        expect(coverage.permissions).toEqual({contents: 'read'});
        const steps = coverage.jobs.coverage.steps;
        expect(steps.find((step) => step.uses === 'actions/checkout@v5')?.with).toEqual({
            'fetch-depth': 0,
            'persist-credentials': false,
        });
        expect(steps.find((step) => step.name === 'Run tests with coverage')?.if).toBeUndefined();
        expect(steps.find((step) => step.name === 'Upload coverage artifact')?.if).toBe(
            "success() && steps.coverage-run.outputs.ran == 'true'",
        );
    });

    it('does not expose the Sonar token on Dependabot PRs, including human reruns', () => {
        const steps = workflow('coverage').jobs.coverage.steps;
        const scan = steps.find((step) => step.name === 'SonarCloud Scan');
        expect(scan?.if).toContain("github.actor != 'dependabot[bot]'");
        expect(scan?.if).toContain("github.event.pull_request.user.login != 'dependabot[bot]'");
        expect(scan?.if).toContain(
            'github.event.pull_request.head.repo.full_name == github.repository',
        );
        expect(steps.find((step) => step.name === 'Explain secretless coverage')?.run).toContain(
            'Coverage tests and artifact completed',
        );
        expect(JSON.stringify(steps.filter((step) => step !== scan))).not.toContain('SONAR_TOKEN');
    });

    it('validates Dependabot lockfiles without lifecycle scripts, secrets or a writer token', () => {
        const lock = workflow('package-lock');
        const verify = lock.jobs['verify-dependabot-lock'];
        expect(lock.permissions).toEqual({contents: 'read'});
        expect(enabled(verify.if, 'dependabot[bot]')).toBe(true);
        expect(enabled(verify.if, 'dependabot[bot]', 'maintainer')).toBe(true);
        expect(enabled(verify.if, 'maintainer')).toBe(false);
        expect(verify.steps.find((step) => step.uses === 'actions/checkout@v5')?.with).toEqual({
            'persist-credentials': false,
        });
        expect(verify.steps.find((step) => step.uses?.includes('setup-node-action'))?.with).toEqual(
            {
                'node-version': "${{ vars.NODE_VERSION || '24' }}",
                cache: '',
                'run-install': 'false',
            },
        );
        expect(
            verify.steps.find((step) => step.name === 'Validate the existing lockfile')?.run,
        ).toBe('npm ci --no-workspaces --ignore-scripts');
        expect(JSON.stringify(verify)).not.toContain('secrets.');
    });

    it('retains write-back only for same-repository non-Dependabot authors and actors', () => {
        const writer = workflow('package-lock').jobs['update-package-lock'];
        expect(writer.permissions).toEqual({contents: 'write'});
        expect(writer.if).toContain(
            'github.event.pull_request.head.repo.full_name == github.repository',
        );
        expect(writer.if).toContain("github.event.pull_request.user.login != 'dependabot[bot]'");
        expect(writer.if).toContain("github.actor != 'dependabot[bot]'");
    });

    it('keeps verifier and writer mutually exclusive across compatible lockfile workflow versions', () => {
        const lock = workflow('package-lock');
        const verify = lock.jobs['verify-dependabot-lock'];
        const writer = lock.jobs['update-package-lock'];
        const candidate = 'codex/dependency-candidate-0123456789abcdef';
        // Accept the current stable template and its immutable-candidate successor.
        const supportsCandidates = enabled(
            verify.if,
            'diplodoc-bot',
            'maintainer',
            false,
            candidate,
        );
        const cases = [
            {author: 'dependabot[bot]', actor: 'dependabot[bot]'},
            {author: 'dependabot[bot]', actor: 'maintainer'},
            {author: 'maintainer', actor: 'dependabot[bot]'},
            {author: 'maintainer', actor: 'maintainer'},
            {author: 'maintainer', actor: 'maintainer', fork: true},
            {author: 'diplodoc-bot', actor: 'maintainer', branch: candidate},
            {author: 'diplodoc-bot', actor: 'yc-ui-bot', branch: candidate},
            {author: 'diplodoc-bot', actor: 'maintainer', branch: candidate, fork: true},
        ];
        for (const row of cases) {
            const immutable =
                row.author === 'dependabot[bot]' ||
                (supportsCandidates && row.branch === candidate);
            const verifies = enabled(verify.if, row.author, row.actor, row.fork, row.branch);
            const writes = enabled(writer.if, row.author, row.actor, row.fork, row.branch);
            expect(verifies).toBe(immutable);
            expect(writes).toBe(!immutable && !row.fork && row.actor !== 'dependabot[bot]');
            expect(verifies && writes).toBe(false);
        }
    });

    it('preserves the required lock context and fails unless the applicable lane succeeds', () => {
        const {jobs} = workflow('package-lock');
        const result = jobs['package-lock-result'];
        const verify = jobs['verify-dependabot-lock'];
        const writer = jobs['update-package-lock'];
        const prepared = 'codex/dependency-group-0123456789abcdef01234567';
        const supportsPrepared = verify.if?.includes('codex/dependency-group-') === true;

        expect(result.name).toBe('Update package-lock.json');
        expect(result.needs).toEqual(['verify-dependabot-lock', 'update-package-lock']);
        expect(result.if).toMatch(/^always\(\)\s*&&/);
        expect(enabled(result.if, 'maintainer')).toBe(true);
        expect(enabled(result.if, 'dependabot[bot]', 'maintainer')).toBe(true);
        expect(enabled(result.if, 'contributor', 'maintainer', true)).toBe(false);
        expect(enabled(result.if, 'diplodoc-bot', 'maintainer', true, prepared)).toBe(false);
        expect(
            enabled(result.if, 'contributor', 'maintainer', true, prepared, 'diplodoc-bot'),
        ).toBe(false);
        expect(
            enabled(result.if, 'diplodoc-bot', 'maintainer', true, prepared, 'diplodoc-bot'),
        ).toBe(supportsPrepared);
        expect(
            enabled(verify.if, 'diplodoc-bot', 'maintainer', true, prepared, 'diplodoc-bot'),
        ).toBe(supportsPrepared);
        expect(
            enabled(writer.if, 'diplodoc-bot', 'maintainer', true, prepared, 'diplodoc-bot'),
        ).toBe(false);
        const gate = result.steps[0];
        expect(gate.env?.LOCK_RESULT).toContain('needs.verify-dependabot-lock.result');
        expect(gate.env?.LOCK_RESULT).toContain('needs.update-package-lock.result');
        expect(gate.run).toContain('test "$LOCK_RESULT" = success');
    });
});

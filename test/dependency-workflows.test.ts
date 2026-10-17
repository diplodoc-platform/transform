import {readFileSync} from 'fs';
import {resolve} from 'path';
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
        expect(verify.if).toBe("github.event.pull_request.user.login == 'dependabot[bot]'");
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

    it('preserves the required lock context and fails unless the applicable lane succeeds', () => {
        const result = workflow('package-lock').jobs['package-lock-result'];
        expect(result.name).toBe('Update package-lock.json');
        expect(result.needs).toEqual(['verify-dependabot-lock', 'update-package-lock']);
        expect(result.if).toBe(
            'always() && github.event.pull_request.head.repo.full_name == github.repository',
        );
        const gate = result.steps[0];
        expect(gate.env?.LOCK_RESULT).toContain('needs.verify-dependabot-lock.result');
        expect(gate.env?.LOCK_RESULT).toContain('needs.update-package-lock.result');
        expect(gate.run).toContain('test "$LOCK_RESULT" = success');
    });
});

import type {TaskListInstaller, TaskListParser} from './capture';

import {captureTaskRule} from './capture';

const {tasklist}: {tasklist: TaskListInstaller} = require('@mdit/plugin-tasklist');

// Capture the one rule installed by the pinned upstream plugin, without installing
// its env counter on the caller's parser.
export default function taskList(md: TaskListParser) {
    const ruler = md.core.ruler;
    const runUpstream = captureTaskRule(md, (parser) => {
        tasklist(parser, {disabled: true, label: true, labelClass: 'yfm-task-label'});
    });

    const run: Parameters<typeof ruler.after>[2] = (state) => {
        const originalEnv = state.env;
        const suppressed: Array<{token: (typeof state.tokens)[number]; content: string}> = [];
        const candidates = new Set<(typeof state.tokens)[number]>();

        for (let i = 2; i < state.tokens.length; i++) {
            const token = state.tokens[i];
            if (
                token.type !== 'inline' ||
                state.tokens[i - 1].type !== 'paragraph_open' ||
                state.tokens[i - 2].type !== 'list_item_open'
            ) {
                continue;
            }
            const first = token.children?.[0];
            const valid =
                /^\[(?: |\u00a0|x|X)\][ \u00a0]/.test(token.content) &&
                token.content.slice(4).trim().length > 0 &&
                first?.type === 'text' &&
                /^\[(?: |\u00a0|x|X)\]/.test(first.content);
            if (valid) {
                candidates.add(token);
            } else {
                suppressed.push({token, content: token.content});
                token.content = '';
            }
        }

        try {
            state.env = {};
            runUpstream(state);
        } finally {
            state.env = originalEnv;
            for (const {token, content} of suppressed) token.content = content;
        }

        for (const token of candidates) {
            const children = token.children;
            if (
                !children ||
                children[0]?.type !== 'checkbox_input' ||
                children[1]?.type !== 'label_open'
            ) {
                throw new Error('Unexpected task-list plugin output');
            }
            const [input, label] = children;
            input.attrs = input.attrs?.filter(([name]) => name !== 'id') ?? null;
            input.attrSet('disabled', 'disabled');
            label.attrs = label.attrs?.filter(([name]) => name !== 'for') ?? null;
            children.splice(0, 2, label, input);
        }
    };

    // A tail already installed must finish before tasks inside its moved tokens.
    // When installed later, a normal after-inline insertion precedes this rule.
    try {
        ruler.after('footnote_tail', 'yfm_task_list', run);
    } catch (error) {
        if (!(error instanceof Error) || error.message !== 'Parser rule not found: footnote_tail') {
            throw error;
        }
        ruler.after('inline', 'yfm_task_list', run);
    }
}

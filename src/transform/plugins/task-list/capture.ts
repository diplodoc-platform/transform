import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownItTaskListOptions} from '@mdit/plugin-tasklist' with {
    'resolution-mode': 'import',
};

/** Public input fields used by the pinned rule and this adapter. */
export interface TaskListInput {
    tokens: Token[];
    env: object;
    Token: new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;
}
export interface TaskListParser {
    core: {
        ruler: {
            after(anchor: string, name: string, rule: (state: TaskListInput) => void): void;
        };
    };
}

// Pinned 1.1.4 reads only core.ruler.after during installation. Its captured
// rule reads only tokens, env and the native Token constructor. Keep that
// finite JavaScript module boundary while retaining upstream's option schema.
export type TaskListInstaller = (md: TaskListParser, options?: MarkdownItTaskListOptions) => void;

// The pinned upstream implementation installs exactly one core rule.
export function captureTaskRule(md: TaskListParser, register: (md: TaskListParser) => void) {
    const ruler = md.core.ruler;
    const original = Object.getOwnPropertyDescriptor(ruler, 'after');
    let captured: Parameters<typeof ruler.after>[2] | undefined;

    try {
        Object.defineProperty(ruler, 'after', {
            configurable: true,
            writable: true,
            value: (anchor: string, name: string, rule: Parameters<typeof ruler.after>[2]) => {
                if (anchor !== 'inline' || name !== 'task_list' || captured) {
                    throw new Error('Unexpected task-list plugin registration');
                }
                captured = rule;
            },
        });
        register(md);
    } finally {
        if (original) {
            Object.defineProperty(ruler, 'after', original);
        } else {
            Reflect.deleteProperty(ruler, 'after');
        }
    }

    if (!captured) {
        throw new Error('Task-list plugin did not register its core rule');
    }
    return captured;
}

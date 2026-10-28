import type {MarkdownIt} from '../../typings';

// The pinned upstream implementation installs exactly one core rule.
export function captureTaskRule(md: MarkdownIt, register: (md: MarkdownIt) => void) {
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

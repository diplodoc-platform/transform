type DatasetKey = `data-${string}`;
type Attrs = 'class' | 'id' | DatasetKey;

type Selector = (value: string) => {
    key: Attrs;
    value: string;
} | null;

const wrapToData = (key: string): DatasetKey => {
    if (key.startsWith('data-')) {
        return key as DatasetKey;
    }

    return `data-${key}`;
};

const selectors = {
    class(value: string) {
        if (value.startsWith('.')) {
            return {
                key: 'class',
                value: value.slice(1),
            };
        }

        return null;
    },
    id(value: string) {
        if (value.startsWith('#')) {
            return {
                key: 'id',
                value: value.slice(1),
            };
        }

        return null;
    },
    attr(value: string) {
        const parts = value.split('=');

        if (parts.length === 2) {
            return {
                key: wrapToData(parts[0]) as DatasetKey,
                value: parts[1],
            };
        }

        return {
            key: wrapToData(value) as DatasetKey,
            value: 'true',
        };
    },
};

const handlers = Object.values(selectors) as Selector[];

export function parseAttrs(inputString: string) {
    const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .=-_#';

    if (!inputString.startsWith('{')) {
        return null;
    }

    for (let i = 1; i < inputString.length; i++) {
        const char = inputString[i];

        if (char === '}') {
            const contentInside = inputString.slice(1, i).trim(); // content excluding { and }

            if (!contentInside) {
                return null;
            }

            const parts = contentInside.split(' ');

            const attrs: Record<string, string[]> = {
                class: [],
                id: [],
            };

            parts.forEach((part) => {
                const matched = handlers.find((test) => test(part));

                if (!matched) {
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const {key, value} = matched(part)!;

                if (!attrs[key]) {
                    attrs[key] = [];
                }

                attrs[key].push(value);
            });

            return attrs;
        }

        if (!validChars.includes(char)) {
            return null;
        }
    }

    return null;
}

import {FrontMatter} from './common';

export const transformFrontMatterValues = (
    frontMatter: FrontMatter,
    valueMapper: (v: unknown) => unknown,
): FrontMatter => {
    const transformInner = (something: unknown): unknown => {
        if (typeof something === 'object' && something !== null) {
            return Object.fromEntries(
                Object.entries(something).map(([k, v]) => [k, transformInner(v)]),
            );
        }

        if (Array.isArray(something)) {
            return something.map((el) => transformInner(el));
        }

        return valueMapper(something);
    };

    return transformInner(frontMatter) as FrontMatter;
};

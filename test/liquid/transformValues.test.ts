import {transformFrontMatterValues} from '../../src/transform/frontmatter';

describe('transformFrontMatterValues utility function', () => {
    it.each([
        {desc: 'strings', value: 'test'},
        {desc: 'numbers', value: 420.69},
        {desc: 'boolean', value: true},
        {desc: 'bigint', value: BigInt('0x1fffffffffffff')},
        {desc: 'symbol', value: Symbol('$$Test')},
        {desc: 'undefined', value: undefined},
        {desc: 'null', value: 'null'},
    ])('calls value mapper on primitive values inside the object ($desc)', ({value}) => {
        const mapper = jest.fn((v: unknown) => v);
        const noop = jest.fn();
        const obj = {};
        const arr = [] as [];
        const inst = new (class {})();
        const fm = {prop: value, noop, obj, arr, inst};

        transformFrontMatterValues(fm, mapper);

        expect(mapper).toBeCalledWith(value);
        expect(mapper).not.toBeCalledWith(noop);
        expect(mapper).not.toBeCalledWith(obj);
        expect(mapper).not.toBeCalledWith(arr);
        expect(mapper).not.toBeCalledWith(inst);
    });

    it('recursively traverses the object', () => {
        const fm = {
            prop: {
                a: 7,
                b: {
                    c: 9,
                    d: {
                        e: {f: 11},
                    },
                },
            },
        };

        const transformed = transformFrontMatterValues(fm, (v) =>
            typeof v === 'number' ? v + 2 : v,
        );

        expect(transformed).toEqual({prop: {a: 9, b: {c: 11, d: {e: {f: 13}}}}});
    });

    it('recursively traverses arrays inside the object', () => {
        const fm = {
            arr: [1, 2, 3, {prop: 7, moreDepth: [5, {a: 11}]}],
        };

        const transformed = transformFrontMatterValues(fm, (v) =>
            typeof v === 'number' ? v + 2 : v,
        );

        expect(transformed).toEqual({arr: [3, 4, 5, {prop: 9, moreDepth: [7, {a: 13}]}]});
    });

    it('can handle arrays as an entrypoint if need be', () => {
        const fm = [1, 2, 3, {prop: 7, moreDepth: [5, {a: 11}]}];

        const transformed = transformFrontMatterValues(fm as {}, (v) =>
            typeof v === 'number' ? v + 2 : v,
        );

        expect(transformed).toEqual([3, 4, 5, {prop: 9, moreDepth: [7, {a: 13}]}]);
    });
});

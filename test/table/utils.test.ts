import {parseAttrs} from '../../src/transform/plugins/table/utils';

describe('parseAttrsClass', () => {
    it('should correctly parse a class in markdown attrs format', () => {
        expect(parseAttrs('{property=value .class}')).toEqual({
            'data-property': ['value'],
            class: ['class'],
            id: [],
        });
    });

    it('should correctly parse a class when its the only property', () => {
        expect(parseAttrs('{.class}')).toEqual({
            class: ['class'],
            id: [],
        });
    });

    it('should require a whitespace if there are other properties', () => {
        expect(parseAttrs('{property=value.class}')).toEqual({
            'data-property': ['value.class'],
            id: [],
            class: [],
        });
    });

    it('should bail if there are unexpected symbols', () => {
        expect(parseAttrs('{property="value" .class}')).toEqual(null);
    });

    it('should allow a dash in the class name', () => {
        expect(parseAttrs('{.cell-align-center}')).toEqual({
            id: [],
            class: ['cell-align-center'],
        });
    });

    it('should not touch includes', () => {
        expect(parseAttrs('{% include <a href="./mocks/include.md">create-folder</a> %}')).toEqual(
            null,
        );
    });
});

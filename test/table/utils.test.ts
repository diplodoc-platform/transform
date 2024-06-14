import {parseAttrsClass} from '../../src/transform/plugins/table/utils';

describe('parseAttrsClass', () => {
    it('should correctly parse a class in markdown attrs format', () => {
        expect(parseAttrsClass('{property=value .class}')).toEqual('class');
    });

    it('should correctly parse a class when its the only property', () => {
        expect(parseAttrsClass('{.class}')).toEqual('class');
    });

    it('should require a whitespace if there are other properties', () => {
        expect(parseAttrsClass('{property=value.class}')).toEqual(null);
    });

    it('should bail if there are unexpected symbols', () => {
        expect(parseAttrsClass('{property="value" .class}')).toEqual(null);
    });

    it('should allow a dash in the class name', () => {
        expect(parseAttrsClass('{.cell-align-center}')).toEqual('cell-align-center');
    });

    it('should not touch includes', () => {
        expect(
            parseAttrsClass('{% include <a href="./mocks/include.md">create-folder</a> %}'),
        ).toEqual(null);
    });
});

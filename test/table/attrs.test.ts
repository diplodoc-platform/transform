import {AttrsParser} from '../../src/transform/plugins/attrs';

describe('attrs parser tests', () => {
    it('parses classes and ids', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{.test .name #id #help}');

        expect(result).toEqual({
            class: ['test', 'name'],
            id: ['id', 'help'],
        });
    });

    it('parses single key attrs', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{is-visible data-is-visible}');

        expect(result).toEqual({
            attr: ['is-visible', 'data-is-visible'],
        });
    });

    it('parses wide mode', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{wide-view wide-name="short table"}');

        expect(result).toEqual({
            attr: ['wide-view'],
            'wide-name': ['short table'],
        });
    });

    it('parses full attrs', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{is-visible=true data-is-visible="true"}');

        expect(result).toEqual({
            'is-visible': ['true'],
            'data-is-visible': ['true'],
        });
    });

    it('with not closed attrs', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{is-visible="true data-is-visible="}');

        expect(result).toEqual({
            'is-visible': ['true data-is-visible='],
        });
    });

    it('with complex attrs', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse(
            '{wide-content wide-name="very big name" with-extend="true" extendable=true name}',
        );

        expect(result).toEqual({
            attr: ['wide-content', 'name'],
            'wide-name': ['very big name'],
            'with-extend': ['true'],
            extendable: ['true'],
        });
    });

    it('with all attrs', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse(
            '{wide-content .name .id wide-name="very big name" with-extend="true" .hello-world extendable=true name #id}',
        );

        expect(result).toEqual({
            class: ['name', 'id', 'hello-world'],
            id: ['id'],
            attr: ['wide-content', 'name'],
            'wide-name': ['very big name'],
            'with-extend': ['true'],
            extendable: ['true'],
        });
    });

    it('with curly attrs', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse(
            '{wide-content .name .id wide-name="very {{big}} name" with-extend="true" .hello-world extendable=true name #id}',
        );

        expect(result).toEqual({
            class: ['name', 'id', 'hello-world'],
            id: ['id'],
            attr: ['wide-content', 'name'],
            'wide-name': ['very {{big}} name'],
            'with-extend': ['true'],
            extendable: ['true'],
        });
    });

    it('should not touch includes', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{% include <a href="./mocks/include.md">create-folder</a> %}');

        expect(result).toEqual({});
    });

    it('should return id', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{invalid= #valid-id}');

        expect(result).toEqual({
            id: ['valid-id'],
            invalid: [' '],
        });
    });

    it('should return id with " and spaces', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{invalid="          " #valid-id}');

        expect(result).toEqual({
            id: ['valid-id'],
            invalid: ['          '],
        });
    });

    it('should return class with dots', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{.name.lastname.test}');

        expect(result).toEqual({
            class: ['name.lastname.test'],
        });
    });

    it('should return url', () => {
        const attrs = new AttrsParser();

        const result = attrs.parse('{url=/test/route data-url="/route/test"}');

        expect(result).toEqual({
            url: ['/test/route'],
            'data-url': ['/route/test'],
        });
    });
});

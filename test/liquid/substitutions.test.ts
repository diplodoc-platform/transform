import {liquidSnippet} from '../../src/transform/liquid';

describe('Substitutions', () => {
    test('Should substitute to inline text', () => {
        expect(liquidSnippet('Hello {{ user.name }}!', {user: {name: 'Alice'}})).toEqual(
            'Hello Alice!',
        );
    });
    test('Should not substitute variables start with dot', () => {
        expect(liquidSnippet('Hello {{ .name }}', {})).toEqual('Hello {{ .name }}');
    });
    test('Should not substitute variables wrapped not_var', () => {
        expect(liquidSnippet('Hello not_var{{ user.name }}!', {user: {name: 'Alice'}})).toEqual(
            'Hello {{ user.name }}!',
        );
    });
    test('Keep not_var syntax', () => {
        expect(
            liquidSnippet('Hello not_var{{ user.name }}!', {user: {name: 'Alice'}}, '', {
                keepNotVar: true,
            }),
        ).toEqual('Hello not_var{{ user.name }}!');
    });

    test('Should return unchanged string if no variables present', () => {
        const input = 'This is just a string';
        expect(liquidSnippet(input, {})).toEqual(input);
    });

    test('Should return unchanged string if variable not found in context', () => {
        const input = 'Variable {{ notFound }} not found';
        expect(liquidSnippet(input, {})).toEqual(input);
    });

    test('Should substitute multiple occurrences of the same variable', () => {
        const input = 'Repeated {{ variable }} here and also here: {{ variable }}';
        const context = {variable: 'value'};
        expect(liquidSnippet(input, context)).toEqual('Repeated value here and also here: value');
    });

    describe('Should save type of variable, if possible', () => {
        const string = 'Example';
        const number = 10;
        const boolean = true;
        const nullVar = null;
        const array = ['item1', 'item2', 'item3'];
        const object = {key1: 'value1', key2: 'value2'};
        const undefinedVar = undefined;

        test('Should substitute to string', () => {
            expect(liquidSnippet('{{ string }}', {string})).toEqual(string);
        });

        test('Should substitute to number', () => {
            expect(liquidSnippet('{{ number }}', {number})).toEqual(number);
        });

        test('Should substitute to boolean', () => {
            expect(liquidSnippet('{{ boolean }}', {boolean})).toEqual(boolean);
        });

        test('Should substitute to null', () => {
            expect(liquidSnippet('{{ nullVar }}', {nullVar})).toEqual(nullVar);
        });

        test('Should substitute to array', () => {
            expect(liquidSnippet('{{ array }}', {array})).toEqual(array);
        });

        test('Should substitute to object', () => {
            expect(liquidSnippet('{{ object }}', {object})).toEqual(object);
        });

        test('Should not substitute undefined vars', () => {
            expect(liquidSnippet('{{ undefinedVar }}', {undefinedVar})).toEqual(
                '{{ undefinedVar }}',
            );
        });

        test('Should substitute to string if input contains more than one variable', () => {
            expect(liquidSnippet('{{ number }} {{ boolean }}', {number, boolean})).toEqual(
                `${number} ${boolean}`,
            );

            expect(liquidSnippet('{{ number }} postfix', {number})).toEqual(`${number} postfix`);
        });
    });
});

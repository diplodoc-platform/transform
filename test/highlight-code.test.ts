import {dirname} from 'path';

import transform from '../src/transform';

const mocksPath = require.resolve('./utils.ts');
const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [],
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

test('should highlight code', () => {
    const result = transformYfm("```ts\nconst x: string = 'y';\n```");

    expect(result).toMatchSnapshot();
});

import {dirname} from 'node:path';
import typescript from 'highlight.js/lib/languages/typescript';
import transform from '../src/transform';

const mocksPath = require.resolve('./utils.ts');
const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [],
        highlightLangs: {ts: typescript},
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

test('should highlight code', () => {
    const result = transformYfm("```ts\nconst x: string = 'y';\n```");

    expect(result).toMatchSnapshot();
});

import initMarkdown from '../src/transform/md';
import plugin from '../src/transform/plugins/block-anchor';
import implicitLink from '../src/transform/plugins/implicit-link';
import links from '../src/transform/plugins/links';


const {parse, compile} = initMarkdown({plugins: [plugin, links, implicitLink]});

describe('implicit-link', function () {
    it('renders implicit-link', () => {
        const input = 'https://google.com';
        const actual = compile(parse(input));
        expect(actual).toMatchSnapshot();
    });
});
u
import transform from '../src/transform';
import tabsPlugin from '../src/transform/plugins/tabs';
import {callPlugin, tokenize} from './utils';
import {base, escaped} from './data/tabs';
import Token from 'markdown-it/lib/token';
import {MarkdownItPluginOpts} from 'src/transform/plugins/typings';

const transformYfm = (text: string, opts?: MarkdownItPluginOpts) => {
    const {
        result: {html},
    } = transform(text, {
        ...opts,
    });
    return html;
};

const convertAttrsToObject = ({attrs}: Token) =>
    attrs?.reduce((acc: Record<string, string>, [name, value]) => {
        acc[name] = value;

        return acc;
    }, {}) || {};

describe('Tabs', () => {
    let result: Token[], tabs: Token[], tabPanels: Token[];

    beforeAll(() => {
        result = callPlugin(
            tabsPlugin,
            tokenize([
                '# Create a folder',
                '',
                '{% list tabs %}',
                '',
                '- Python',
                '',
                '  About python',
                '',
                '- Tab with list',
                '  - One',
                '  - Two',
                '',
                '- Tab with list',
                '  1. One',
                '  2. Two',
                '',
                '{% endlist %}',
                '',
                'After tabs',
            ]),
        );

        tabs = result.filter(({type}) => type === 'tab_open');
        tabPanels = result.filter(({type}) => type === 'tab-panel_open');
    });

    test('Should convert to correct new token array', () => {
        const clearJSON = JSON.parse(JSON.stringify(result.map(({attrs: _, ...item}) => item)));

        expect(clearJSON).toEqual(base);
    });

    test('Should use correct attrs', () => {
        const attrs = ['id', 'class', 'role', 'aria-controls', 'aria-selected', 'tabindex'];

        tabs.forEach((tab, i) => {
            const attrsObject = convertAttrsToObject(tab);

            expect(Object.keys(attrsObject)).toEqual(attrs);
            expect(attrsObject['class']).toEqual(`yfm-tab${i === 0 ? ' active' : ''}`);
            expect(attrsObject['role']).toEqual('tab');
        });
    });

    test('Tab should fit tabPanel', () => {
        expect(tabs.length).toEqual(tabPanels.length);

        tabs.forEach((tab, i) => {
            const tabPanel = tabPanels[i];
            const attrsObject = convertAttrsToObject(tab);
            const panelAttrsObject = convertAttrsToObject(tabPanel);

            expect(attrsObject['aria-controls']).toEqual(panelAttrsObject['id']);
        });
    });

    test('Tab syntax is escaped', () => {
        const escapedTabTokens = callPlugin(tabsPlugin, tokenize(['`{% list tabs %}`']));

        expect(escapedTabTokens).toEqual(escaped);
    });

    test('Tabs are transformed into headings and paragraphs in print mode', () => {
        const expectedInput = [
            '#### Tab 1',
            '',
            'Tab 1 content',
            '',
            '#### Tab 2',
            '',
            'Tab 2 content',
        ].join('\n');
        const tabsInput = [
            '{% list tabs %}',
            '',
            '- Tab 1',
            '',
            '  Tab 1 content',
            '',
            '- Tab 2',
            '',
            '  Tab 2 content',
            '',
            '{% endlist %}',
        ].join('\n');

        const expectedResult = transformYfm(expectedInput);
        const tabsResult = transformYfm(tabsInput, {printMode: true} as MarkdownItPluginOpts);

        expect(expectedResult).toBe(tabsResult);
    });
});

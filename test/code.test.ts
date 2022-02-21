import MarkdownIt from 'markdown-it';
import code from '../src/transform/plugins/code';
import {MarkdownItPluginOpts} from '../src/transform/plugins/typings';

const getMd = (fence: jest.Mock) => ({
    renderer: {
        rules: {
            fence,
        },
    },
});

describe('Code', () => {
    it('should call default fence method', () => {
        const fence = jest.fn();
        const md = getMd(fence);
        code(md as unknown as MarkdownIt, {} as MarkdownItPluginOpts);
        md.renderer.rules.fence(1, 2, 3, 4, 5);

        expect(fence).toBeCalledWith(1, 2, 3, 4, 5);
    });
});

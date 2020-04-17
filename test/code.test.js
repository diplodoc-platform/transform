const code = require('../lib/plugins/code');

const getMd = (fence) => ({
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
        code(md);
        md.renderer.rules.fence(1, 2, 3, 4, 5);

        expect(fence).toBeCalledWith(1, 2, 3, 4, 5);
    });
});

import {Token} from 'markdown-it';

import transform from '../src/transform';
import {ExtendedPluginWithCollect, IntrinsicCollectOptions} from '../src/transform/typings';

describe('transform.collect', () => {
    it(`applies liquid if it wasn't disabled`, () => {
        const input = `### Docs for {{ product }}`;
        const vars = {product: 'Diplodoc Platform'};

        const pluginWithCollect: ExtendedPluginWithCollect = jest.fn();
        pluginWithCollect.collect = jest.fn();

        const result = transform.collect(input, {
            mdItInitOptions: {
                plugins: [pluginWithCollect],
                vars: vars,
            },
            pluginCollectOptions: {},
        });

        expect(pluginWithCollect.collect).toHaveBeenCalledTimes(1);
        expect(pluginWithCollect.collect).toHaveBeenCalledWith(
            '### Docs for Diplodoc Platform',
            expect.objectContaining<IntrinsicCollectOptions>({
                tokenStream: expect.arrayContaining<Token>([
                    expect.objectContaining({
                        children: expect.arrayContaining<Token>([
                            expect.objectContaining({content: 'Docs for Diplodoc Platform'}),
                        ]),
                    }),
                ]),
            }),
        );

        expect(result).toBe('### Docs for Diplodoc Platform');
    });

    it(`doesn't apply liquid if it was explicitly disabled by passing isLiquided = true`, () => {
        const input = `### Docs for {{ product }}`;
        const vars = {product: 'Diplodoc Platform'};

        const pluginWithCollect: ExtendedPluginWithCollect = jest.fn();
        pluginWithCollect.collect = jest.fn();

        const result = transform.collect(input, {
            mdItInitOptions: {
                plugins: [pluginWithCollect],
                vars: vars,
                isLiquided: true,
            },
            pluginCollectOptions: {},
        });

        expect(pluginWithCollect.collect).toHaveBeenCalledTimes(1);
        expect(pluginWithCollect.collect).toHaveBeenCalledWith(
            '### Docs for {{ product }}',
            expect.objectContaining<IntrinsicCollectOptions>({
                tokenStream: expect.arrayContaining<Token>([
                    expect.objectContaining({
                        children: expect.arrayContaining<Token>([
                            expect.objectContaining({content: 'Docs for {{ product }}'}),
                        ]),
                    }),
                ]),
            }),
        );

        expect(result).toBe('### Docs for {{ product }}');
    });

    it(`doesn't apply liquid if it was explicitly disabled by passing disableLiquid = true`, () => {
        const input = `### Docs for {{ product }}`;
        const vars = {product: 'Diplodoc Platform'};

        const pluginWithCollect: ExtendedPluginWithCollect = jest.fn();
        pluginWithCollect.collect = jest.fn();

        const result = transform.collect(input, {
            mdItInitOptions: {
                plugins: [pluginWithCollect],
                vars: vars,
                disableLiquid: true,
            },
            pluginCollectOptions: {},
        });

        expect(pluginWithCollect.collect).toHaveBeenCalledTimes(1);
        expect(pluginWithCollect.collect).toHaveBeenCalledWith(
            '### Docs for {{ product }}',
            expect.objectContaining<IntrinsicCollectOptions>({
                tokenStream: expect.arrayContaining<Token>([
                    expect.objectContaining({
                        children: expect.arrayContaining<Token>([
                            expect.objectContaining({content: 'Docs for {{ product }}'}),
                        ]),
                    }),
                ]),
            }),
        );

        expect(result).toBe('### Docs for {{ product }}');
    });

    it('applies collect function in order as specified by the plugin array', () => {
        const pluginFactory = (textToAppend: string) => {
            const plugin: ExtendedPluginWithCollect = jest.fn();

            plugin.collect = (input: string) => `${input}${textToAppend}`;

            return plugin;
        };

        const result = transform.collect('', {
            mdItInitOptions: {
                plugins: [pluginFactory('foo'), pluginFactory('bar'), pluginFactory('baz')],
            },
            pluginCollectOptions: {},
        });

        expect(result).toBe('foobarbaz');
    });

    it('provides valid token stream to collect functions after running the input through mdit plugins', () => {
        const mockPlugin: ExtendedPluginWithCollect = (md) => {
            md.core.ruler.push('mock', (state) =>
                state.tokens.push(new state.Token('mockToken', 'mock', 0)),
            );
        };

        mockPlugin.collect = jest.fn();

        transform.collect('', {
            mdItInitOptions: {
                plugins: [mockPlugin],
            },
            pluginCollectOptions: {},
        });

        expect(mockPlugin.collect).toHaveBeenCalledWith(
            '',
            expect.objectContaining<IntrinsicCollectOptions>({
                tokenStream: expect.arrayContaining<Token>([
                    expect.objectContaining({type: 'mockToken'}),
                ]),
            }),
        );
    });

    it('prioritizes PluginOverrides when evaluating the token stream to pass to collect functions', () => {
        const mockPluginFactory = (tokenType: string) => {
            const plugin: ExtendedPluginWithCollect = (md) =>
                md.core.ruler.push('mock', (state) =>
                    state.tokens.push(new state.Token(tokenType, 'mock', 0)),
                );

            plugin.collect = jest.fn();

            return plugin;
        };

        const originalPlugin = mockPluginFactory('original');
        const overriddenPlugin = mockPluginFactory('overridden');

        transform.collect('', {
            mdItInitOptions: {
                plugins: [originalPlugin],
            },
            pluginCollectOptions: {},
            parserPluginsOverride: [overriddenPlugin],
        });

        expect(originalPlugin.collect).toHaveBeenCalledWith(
            '',
            expect.objectContaining<IntrinsicCollectOptions>({
                tokenStream: expect.arrayContaining<Token>([
                    expect.objectContaining({type: 'overridden'}),
                ]),
            }),
        );

        expect(originalPlugin.collect).not.toHaveBeenCalledWith(
            '',
            expect.objectContaining<IntrinsicCollectOptions>({
                tokenStream: expect.arrayContaining<Token>([
                    expect.objectContaining({type: 'original'}),
                ]),
            }),
        );
    });

    it('never actually invokes collect functions that may exist in `parserPluginsOverride`', () => {
        const mockPluginFactory = (tokenType: string) => {
            const plugin: ExtendedPluginWithCollect = (md) =>
                md.core.ruler.push('mock', (state) =>
                    state.tokens.push(new state.Token(tokenType, 'mock', 0)),
                );

            plugin.collect = jest.fn(() => tokenType);

            return plugin;
        };

        const originalPlugin = mockPluginFactory('original');
        const overriddenPlugin = mockPluginFactory('overridden');

        const result = transform.collect('', {
            mdItInitOptions: {
                plugins: [originalPlugin],
            },
            pluginCollectOptions: {},
            parserPluginsOverride: [overriddenPlugin],
        });

        expect(result).toBe('original');
        expect(overriddenPlugin.collect).not.toHaveBeenCalled();
    });
});

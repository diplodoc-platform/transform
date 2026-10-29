import type {MarkdownItPluginOpts} from './typings';

// The marker belongs to one installation and is never forwarded to the extension.
const builtin = Symbol('builtin installation');

type MarkedOptions<T> = T & {[builtin]?: unknown};

export function builtinOptions(
    options: MarkdownItPluginOpts,
    plugin: unknown,
): MarkdownItPluginOpts {
    const marked: MarkedOptions<MarkdownItPluginOpts> = {...options, [builtin]: plugin};
    return marked;
}

export function unwrapBuiltin<T extends object>(
    options: MarkedOptions<T> | undefined,
    plugin: unknown,
) {
    if (!options || options[builtin] !== plugin) {
        return {options, automatic: false};
    }
    const {[builtin]: _marker, ...rest} = options;
    return {options: rest, automatic: true};
}

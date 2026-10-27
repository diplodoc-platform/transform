import type {
    ChildParseOptions,
    DocumentEnv,
    DocumentMeta,
    ParsedDocumentFragment,
} from './document';
import type {DeprecationReporter} from './deprecation';
import type {MarkdownIt, ParserEnv} from './typings';

import {createDocumentEnv} from './document';
import {createDeprecationReporter} from './deprecation';

type Services = {checkbox: number};
type Context = {
    pending: DocumentEnv;
    current?: ParserEnv;
    last?: ParserEnv;
    initializers: Set<'meta' | 'assets'>;
    reporter: DeprecationReporter;
};

const contexts = new WeakMap<MarkdownIt, Context>();
const services = new WeakMap<ParserEnv, Services>();
const fragments = new WeakMap<ParsedDocumentFragment, {md: MarkdownIt; contributions: ParserEnv}>();

function initialize(context: Context, env: ParserEnv) {
    if (context.initializers.has('meta')) {
        env.meta ??= {};
    }
    if (context.initializers.has('assets')) {
        env.assets ??= [];
    }
}

// Install only finite legacy fields and synchronous native entry-point scopes.
export function installDocumentContext(md: MarkdownIt, reporter?: DeprecationReporter): Context {
    const existing = contexts.get(md);
    if (existing) {
        return existing;
    }
    const pending = createDocumentEnv();
    const context: Context = {
        pending,
        initializers: new Set(),
        reporter: reporter ?? createDeprecationReporter(),
    };
    contexts.set(md, context);

    for (const field of ['meta', 'assets', 'included'] as const) {
        const previous = md[field];
        if (previous !== undefined) {
            Object.assign(pending, {[field]: previous});
        }
        const warn = () =>
            context.reporter.warn(
                {
                    code: `MD_${field.toUpperCase()}`,
                    feature: `MarkdownIt.${field}`,
                    replacement: `state.env.${field} or document.env.${field}`,
                    removal: {version: '6.0.0'},
                },
                {option: `md.${field}`},
            );
        Object.defineProperty(md, field, {
            configurable: true,
            get() {
                warn();
                return (context.current ?? context.last ?? context.pending)[field];
            },
            set(value: unknown) {
                warn();
                Object.assign(context.current ?? context.last ?? context.pending, {[field]: value});
            },
        });
    }

    for (const name of ['parse', 'parseInline'] as const) {
        const original = md[name];
        md[name] = function (input, env = {}) {
            return withDocumentEnv(md, env, () => original.call(this, input, env));
        };
    }
    // Native rendering owns both phases: parsing alone must not commit a failed render.
    for (const name of ['render', 'renderInline'] as const) {
        const original = md[name];
        md[name] = function (input, env = {}) {
            return withDocumentEnv(md, env, () => original.call(this, input, env));
        };
    }
    for (const name of ['render', 'renderInline'] as const) {
        const original = md.renderer[name];
        md.renderer[name] = function (tokens, options, env = {}) {
            return withDocumentEnv(md, env, () => original.call(this, tokens, options, env));
        };
    }
    return context;
}

export function initializeDocumentField(md: MarkdownIt, field: 'meta' | 'assets') {
    const context = installDocumentContext(md);
    context.initializers.add(field);
    initialize(context, context.pending);
}

export function resetPendingDocument(md: MarkdownIt) {
    const context = installDocumentContext(md);
    context.pending = createDocumentEnv();
    initialize(context, context.pending);
}

export function getDocumentEnv(md: MarkdownIt): ParserEnv {
    const context = installDocumentContext(md);
    return context.current ?? context.last ?? context.pending;
}

export function withDocumentEnv<T>(md: MarkdownIt, env: ParserEnv, action: () => T): T {
    const context = installDocumentContext(md);
    const previous = context.current;
    initialize(context, env);
    context.current = env;
    try {
        const value = action();
        if (!previous) {
            context.last = env;
        }
        return value;
    } finally {
        context.current = previous;
    }
}

export function nextCheckboxId(env: ParserEnv): number {
    let value = services.get(env);
    if (!value) {
        value = {checkbox: 0};
        services.set(env, value);
    }
    return value.checkbox++;
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}

function cspKey(value: Record<string, string[]>): string {
    return JSON.stringify(
        Object.keys(value)
            .sort()
            .map((key) => [key, unique(value[key]).sort()]),
    );
}

// Preserve first occurrence order and the existing array-of-CSP-records shape.
export function normalizeDocumentResources(env: ParserEnv) {
    if (isStringList(env.assets)) {
        env.assets = unique(env.assets);
    }
    const meta = env.meta;
    if (!meta) {
        return;
    }
    for (const name of ['script', 'style'] as const) {
        if (isStringList(meta[name])) {
            meta[name] = unique(meta[name]);
        }
    }
    if (
        Array.isArray(meta.csp) &&
        meta.csp.every(
            (record) =>
                record !== null &&
                typeof record === 'object' &&
                !Array.isArray(record) &&
                Object.values(record).every(
                    (values) =>
                        Array.isArray(values) && values.every((value) => typeof value === 'string'),
                ),
        )
    ) {
        const seen = new Set<string>();
        meta.csp = meta.csp
            .map((record) =>
                Object.fromEntries(
                    Object.entries(record).map(([key, values]) => [key, unique(values)]),
                ),
            )
            .filter((record) => {
                const key = cspKey(record);
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
    }
}

function isStringList(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCspList(value: unknown): value is Record<string, string[]>[] {
    return (
        Array.isArray(value) &&
        value.every(
            (record) =>
                record !== null &&
                typeof record === 'object' &&
                !Array.isArray(record) &&
                Object.values(record).every(isStringList),
        )
    );
}

function prepareMetaMerge(parent: ParserEnv, child: ParserEnv): Partial<DocumentMeta> {
    const updates: Partial<DocumentMeta> = {};
    const childAudiences = child.meta?.visibilityAudiences;
    if (Array.isArray(childAudiences)) {
        const previous = parent.meta?.visibilityAudiences;
        const audiences = new Set([
            ...(Array.isArray(previous) ? previous : []),
            ...childAudiences,
        ]);
        updates.visibilityAudiences = ['human', 'agent'].filter((audience) =>
            audiences.has(audience),
        );
    }
    for (const key of ['script', 'style', 'csp'] as const) {
        const values = child.meta?.[key];
        const valid = key === 'csp' ? isCspList : isStringList;
        // Unknown frontmatter shapes are child-local metadata, not resource lists.
        if (!valid(values) || !values.length) {
            continue;
        }
        const previous = parent.meta?.[key];
        if (previous !== undefined && !valid(previous)) {
            throw new TypeError(
                `Cannot merge document meta.${key}: parent value is not a valid resource array`,
            );
        }
        Object.assign(updates, {[key]: [...(previous ?? []), ...values]});
    }
    return updates;
}

export function parseChildDocumentResult(
    md: MarkdownIt,
    source: string,
    parent: ParserEnv,
    options: ChildParseOptions,
    prepare?: (source: string) => string,
) {
    return withDocumentEnv(md, parent, () => {
        const inheritedTerms = new Set(Object.keys(parent.terms ?? {}));
        const inheritedIncluded = new Set(Object.keys(parent.included ?? {}));
        const child = createDocumentEnv();
        // Custom enumerable extension fields preserve the existing shallow inheritance.
        // Builtin document-owned fields are explicitly replaced below.
        Object.assign(child, parent, createDocumentEnv(), {
            path: options.path ?? parent.path,
            includes: [...(parent.includes ?? [])],
            terms: {...parent.terms},
            changelogs: undefined,
            additionalOptionsCssWhiteList: undefined,
            disableTitleRefSubstitution:
                options.disableTitleRefSubstitution ?? parent.disableTitleRefSubstitution,
            disableCircularError: options.disableCircularError ?? parent.disableCircularError,
        });
        delete child['has-yfm-cut'];
        delete child['has-yfm-file'];
        child.included = {...parent.included};
        let shared = services.get(parent);
        if (!shared) {
            shared = {checkbox: 0};
            services.set(parent, shared);
        }
        services.set(child, shared);
        const tokens = withDocumentEnv(md, child, () => {
            const prepared = prepare ? prepare(source) : source;
            if (typeof prepared !== 'string') {
                throw new TypeError('prepareSource must synchronously return a string');
            }
            return md.parse(prepared, child);
        });
        const contributions: ParserEnv = {
            meta: prepareMetaMerge({}, child),
            assets: isStringList(child.assets) ? [...child.assets] : undefined,
            additionalOptionsCssWhiteList: {...child.additionalOptionsCssWhiteList},
            terms: Object.fromEntries(
                Object.entries(child.terms ?? {}).filter(([key]) => !inheritedTerms.has(key)),
            ),
            included: Object.fromEntries(
                Object.entries(child.included ?? {}).filter(([key]) => !inheritedIncluded.has(key)),
            ),
        };
        // CSP records contain mutable arrays; do not retain references into parsed child data.
        normalizeDocumentResources(contributions);
        mergeContributions(parent, contributions, options.purpose);
        const fragment = Object.freeze({tokens}) as ParsedDocumentFragment;
        fragments.set(fragment, {md, contributions});
        return fragment;
    });
}

export function parseChildDocument(
    md: MarkdownIt,
    source: string,
    parent: ParserEnv,
    options: ChildParseOptions,
    prepare?: (source: string) => string,
) {
    return parseChildDocumentResult(md, source, parent, options, prepare).tokens;
}

export function replayChildDocument(
    md: MarkdownIt,
    fragment: ParsedDocumentFragment,
    parent: ParserEnv,
    options: Pick<ChildParseOptions, 'purpose'>,
) {
    const captured = fragments.get(fragment);
    if (!captured || captured.md !== md) {
        throw new TypeError('Expected a document fragment created by this configured parser');
    }
    mergeContributions(parent, captured.contributions, options.purpose);
}

function mergeContributions(
    parent: ParserEnv,
    child: ParserEnv,
    purpose: ChildParseOptions['purpose'],
) {
    if (purpose !== 'reference') {
        const metaUpdates = prepareMetaMerge(parent, child);
        const assets = isStringList(child.assets) && child.assets.length ? child.assets : undefined;
        if (assets && parent.assets !== undefined && !isStringList(parent.assets)) {
            throw new TypeError('Cannot merge document assets: parent value is not a string array');
        }
        // Validate every resource collision before committing any child contribution.
        if (Object.keys(metaUpdates).length) {
            Object.assign((parent.meta ??= {}), metaUpdates);
        }
        if (assets) {
            parent.assets = [...(parent.assets ?? []), ...assets];
        }
        parent.additionalOptionsCssWhiteList = {
            ...parent.additionalOptionsCssWhiteList,
            ...child.additionalOptionsCssWhiteList,
        };
        if (purpose === 'include') {
            parent.terms = {...child.terms, ...parent.terms};
            parent.included = {...child.included, ...parent.included};
        }
        normalizeDocumentResources(parent);
    }
}

// Only the historical destructurable result view forwards to changing roots.
export function createLegacyEnvView(target: () => ParserEnv): DocumentEnv {
    return new Proxy(createDocumentEnv(), {
        get: (_unused, key) => Reflect.get(target(), key),
        set: (_unused, key, value) => Reflect.set(target(), key, value),
        has: (_unused, key) => Reflect.has(target(), key),
        ownKeys: () => Reflect.ownKeys(target()),
        deleteProperty: (_unused, key) => Reflect.deleteProperty(target(), key),
        getOwnPropertyDescriptor(_unused, key) {
            const descriptor = Reflect.getOwnPropertyDescriptor(target(), key);
            return descriptor && {...descriptor, configurable: true};
        },
        defineProperty(_unused, key, descriptor) {
            if (descriptor.configurable !== true) {
                throw new TypeError(
                    'Define non-configurable fields on document.env, not the legacy env view',
                );
            }
            return Reflect.defineProperty(target(), key, descriptor);
        },
        preventExtensions() {
            throw new TypeError('Freeze or seal document.env, not the legacy env view');
        },
    });
}

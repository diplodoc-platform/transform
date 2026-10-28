import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {ParserEnv} from './shared-types';

import {footnoteService, setFootnoteService} from './document-context-core';

export interface FootnoteRenderer<Options> {
    options: Options;
    renderer: {render(tokens: Token[], options: Options, env: ParserEnv): string};
}

export const FRAME = Symbol('local-footnotes');
export const SOURCE_SCOPE = Symbol('footnote-source');
const SLOT = Symbol('footnote-section');
const OWNED = Symbol('footnote-owned-data');
type OwnedData = {
    scope?: Scope;
    body?: true;
    plan?: Plan;
    id?: number;
    subId?: number;
    label?: string;
};
type OwnedToken = Token & {[OWNED]?: OwnedData};
function ownedData(token: Token): OwnedData | undefined {
    return (token as OwnedToken)[OWNED];
}
function setOwnedData(token: Token, value: OwnedData): void {
    Object.defineProperty(token, OWNED, {value, configurable: true, writable: true});
}
export function isFootnoteBody(token: Token): boolean {
    return ownedData(token)?.body === true;
}
export function hasFootnotePlan(token: Token): boolean {
    return Boolean(ownedData(token)?.plan);
}
export function markFootnoteScope(token: Token, scope: Scope): void {
    const previous = ownedData(token);
    setOwnedData(token, {
        ...previous,
        scope,
        id: previous?.id ?? (typeof token.meta?.id === 'number' ? token.meta.id : undefined),
        subId:
            previous?.subId ??
            (typeof token.meta?.subId === 'number' ? token.meta.subId : undefined),
        label:
            previous?.label ??
            (typeof token.meta?.label === 'string' ? token.meta.label : undefined),
    });
}
export function hasFootnoteTokens(tokens: readonly Token[]): boolean {
    return tokens.some(
        (token) =>
            Boolean(ownedData(token)) ||
            Boolean(token.children && hasFootnoteTokens(token.children)),
    );
}

export interface Definition {
    open: Token;
    body: Token[];
    close: Token;
}
export interface Scope {
    definitions: Map<number, Definition>;
    admittedLabels?: Set<string>;
    origin?: Scope;
    blockOpen?: Token;
    blockClose?: Token;
    rawOutput?: FootnoteService;
}
export interface FootnoteService {
    rootScope: Scope;
    generateID: () => string;
    namespace?: string;
    renderInline?: boolean;
    titleTokens?: Token[];
    publishedTitle?: string;
    titlePlanKey?: string;
    titleReferenceIds?: string[];
}
interface Plan {
    body: string;
    ref: string;
    caption: number;
    reference: number;
}
interface Note {
    refs: Token[];
    caption: number;
    definition?: Definition;
    body: SectionToken[];
}
interface Forest {
    tokens: Token[];
    title: Token[];
    scopes: Map<Scope, Map<number, Note>>;
}
type ScopeMapper = (scope: Scope) => Scope;
type RenderBody = (tokens: Token[]) => string;
type SectionToken = Token | {[SLOT]: Scope};
function isSlot(token: SectionToken): token is {[SLOT]: Scope} {
    return SLOT in token;
}
function isToken(token: SectionToken): token is Token {
    return !isSlot(token);
}
export function sourceScope(tokens: Token[]): Scope | undefined {
    return (tokens as Token[] & {[SOURCE_SCOPE]?: Scope})[SOURCE_SCOPE];
}
function requireTemplate(token: Token | undefined): Token {
    if (!token) throw new Error('Missing footnote section template');
    return token;
}
function noteId(token: Token): number {
    const id = ownedData(token)?.id ?? token.meta?.id;
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0)
        throw new Error('Invalid footnote id');
    return id;
}
function subId(token: Token): number {
    const id = ownedData(token)?.subId ?? token.meta?.subId ?? 0;
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0)
        throw new Error('Invalid footnote reference id');
    return id;
}

/**
 * Mark copied body tokens before heading/navigation inspection.
 * @param tokens - Copied admitted tokens.
 * @returns Nothing; changes only the supplied copies.
 */
export function markFootnoteBody(tokens: Token[]): void {
    walk(tokens, (token) => {
        setOwnedData(token, {...ownedData(token), body: true});
    });
}

export function walk(tokens: readonly Token[], visit: (token: Token) => void) {
    for (const token of tokens) {
        visit(token);
        if (token.children) walk(token.children, visit);
    }
}

export function scopeOf(token: Token): Scope | undefined {
    return ownedData(token)?.scope;
}
function requireScope(token: Token): Scope {
    const scope = scopeOf(token);
    if (!scope) throw new Error('Unowned footnote token');
    return scope;
}
function origin(scope: Scope): Scope {
    return scope.origin ?? scope;
}

export function copyToken(
    token: Token,
    mapScope: ScopeMapper = (scope) => scope,
    type = token.type,
    literal = false,
): Token {
    // Preserve arbitrary custom properties and metadata without interpreting them.
    // Only native token arrays and this feature's private data need independent copies.
    const descriptors = Object.getOwnPropertyDescriptors(token);
    if (descriptors.attrs?.value)
        descriptors.attrs.value = descriptors.attrs.value.map((pair) => [...pair]);
    if (descriptors.map?.value) descriptors.map.value = [...descriptors.map.value];
    if (descriptors.children?.value)
        descriptors.children.value = descriptors.children.value.map((child) =>
            copyToken(child, mapScope, child.type, literal),
        );
    if (descriptors.type && 'value' in descriptors.type) descriptors.type.value = type;
    if (literal && token.type === 'footnote_ref') {
        descriptors.type.value = 'text';
        descriptors.tag.value = '';
        descriptors.content.value = `[^${ownedData(token)?.label ?? token.meta?.label}]`;
    }
    const data = ownedData(token);
    if (data)
        Object.defineProperty(descriptors, OWNED, {
            value: {
                value: {...data, scope: data.scope ? mapScope(data.scope) : undefined},
                configurable: true,
                writable: true,
                enumerable: false,
            },
            enumerable: true,
        });
    return Object.create(Object.getPrototypeOf(token), descriptors);
}

function featureToken(template: Token, type: string, scope: Scope): Token {
    const copy = copyToken(template, (value) => value, type);
    setOwnedData(copy, {...ownedData(copy), scope, body: true});
    return copy;
}

export function restore(
    object: object,
    key: PropertyKey,
    descriptor: PropertyDescriptor | undefined,
) {
    if (descriptor) Object.defineProperty(object, key, descriptor);
    else Reflect.deleteProperty(object, key);
}

export function requirePlan(token: Token): Plan {
    const plan = ownedData(token)?.plan;
    if (!plan) throw new Error('Footnote token rendered without an owned output plan');
    return plan;
}

export function captureDefinitions(tokens: Token[], scope: Scope) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (scopeOf(token) !== scope) continue;
        if (token.type === 'footnote_block_open') scope.blockOpen = token;
        if (token.type === 'footnote_block_close') scope.blockClose = token;
        if (token.type !== 'footnote_open') continue;
        let end = i + 1;
        while (
            end < tokens.length &&
            !(tokens[end].type === 'footnote_close' && scopeOf(tokens[end]) === scope)
        )
            end++;
        if (end === tokens.length) throw new Error('Missing footnote scope close');
        scope.definitions.set(noteId(token), {
            open: token,
            body: tokens
                .slice(i + 1, end)
                .filter((item) => item.type !== 'footnote_anchor' || scopeOf(item) !== scope),
            close: tokens[end],
        });
        i = end;
    }
}

// Return main tokens plus private replacement slots; no marker reaches a parser or renderer.
function removeSections(tokens: Token[], mapScope: ScopeMapper): SectionToken[] {
    const result: SectionToken[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== 'footnote_block_open') {
            result.push(copyToken(token, mapScope));
            continue;
        }
        const scope = requireScope(token);
        result.push({[SLOT]: mapScope(scope)});
        let depth = 1;
        while (++i < tokens.length && depth) {
            if (tokens[i].type === 'footnote_block_open') depth++;
            if (tokens[i].type === 'footnote_block_close') depth--;
        }
        if (depth) throw new Error('Incomplete footnote section selection');
        i--;
    }
    return result;
}

function completeForest(
    tokens: Token[],
    titleTokens: Token[] = [],
    mapScope: ScopeMapper = (scope) => scope,
): Forest {
    // Prefer bodies from the currently admitted forest: other ordinary core rules
    // may have transformed an inserted occurrence since its source was cached.
    const admittedDefinitions = new Map<Scope, Map<number, Definition>>();
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== 'footnote_open') continue;
        const sourceScope = requireScope(token);
        const scope = mapScope(sourceScope);
        let end = i + 1;
        while (
            end < tokens.length &&
            !(tokens[end].type === 'footnote_close' && scopeOf(tokens[end]) === sourceScope)
        )
            end++;
        if (end === tokens.length) throw new Error('Missing admitted note close');
        let definitions = admittedDefinitions.get(scope);
        if (!definitions) admittedDefinitions.set(scope, (definitions = new Map()));
        definitions.set(noteId(token), {
            open: token,
            body: tokens
                .slice(i + 1, end)
                .filter((item) => item.type !== 'footnote_anchor' || scopeOf(item) !== sourceScope),
            close: tokens[end],
        });
        // Capture current bodies of nested admitted scopes too.
    }
    const main = removeSections(tokens, mapScope);
    const title = titleTokens.map((token) => copyToken(token, mapScope));
    const scopes = new Map<Scope, Map<number, Note>>();
    const queue: {scope: Scope; id: number; note: Note}[] = [];
    const seenRefs = new Map<Scope, Set<string>>();
    function scan(list: Token[]) {
        walk(list, (token) => {
            if (token.type !== 'footnote_ref') return;
            const scope = requireScope(token);
            if (!scope) throw new Error('Unowned footnote reference');
            const refKey = `${noteId(token)}:${subId(token)}`;
            let seen = seenRefs.get(scope);
            if (!seen) seenRefs.set(scope, (seen = new Set()));
            if (seen.has(refKey))
                throw new Error(
                    'Repeated cached footnote scope requires materialization per insertion',
                );
            seen.add(refKey);
            let notes = scopes.get(scope);
            if (!notes) scopes.set(scope, (notes = new Map()));
            let note = notes.get(noteId(token));
            if (!note) {
                note = {refs: [], body: [], caption: notes.size + 1};
                notes.set(noteId(token), note);
                queue.push({scope, id: noteId(token), note});
            }
            note.refs.push(token);
        });
    }
    scan(title);
    scan(main.filter(isToken));
    for (let i = 0; i < queue.length; i++) {
        const {scope, id, note} = queue[i];
        const definition =
            admittedDefinitions.get(scope)?.get(id) ?? origin(scope).definitions.get(id);
        if (!definition) throw new Error(`No local body for admitted note ${id}`);
        // Rebind refs inside local definition bodies to this admitted occurrence.
        const localMap = (bodyScope: Scope) =>
            bodyScope === origin(scope) ? scope : mapScope(bodyScope);
        note.definition = definition;
        note.body = removeSections(definition.body, localMap);
        scan(note.body.filter(isToken));
    }
    const emitted = new Set<Scope>();
    function section(scope: Scope): Token[] {
        if (emitted.has(scope)) return [];
        emitted.add(scope);
        const notes = scopes.get(scope);
        if (!notes) return [];
        const source = origin(scope);
        const result = [
            featureToken(requireTemplate(source.blockOpen), 'footnote_block_open', scope),
        ];
        for (const note of notes.values()) {
            const definition = note.definition;
            if (!definition) throw new Error('Missing admitted footnote definition');
            result.push(featureToken(definition.open, 'footnote_open', scope));
            const body = [...note.body];
            const candidate = body[body.length - 1];
            const last =
                candidate && isToken(candidate) && candidate.type === 'paragraph_close'
                    ? candidate
                    : undefined;
            if (last) body.pop();
            for (const token of body) {
                if (isSlot(token)) result.push(...section(token[SLOT]));
                else result.push(token);
            }
            for (const ref of note.refs) {
                result.push(featureToken(ref, 'footnote_anchor', scope));
            }
            if (last) result.push(last);
            result.push(featureToken(definition.close, 'footnote_close', scope));
        }
        result.push(
            featureToken(requireTemplate(source.blockClose), 'footnote_block_close', scope),
        );
        return result;
    }
    const output: Token[] = [];
    for (const token of main) {
        if (isSlot(token)) output.push(...section(token[SLOT]));
        else output.push(token);
    }
    for (const scope of scopes.keys()) {
        if (!emitted.has(scope)) output.push(...section(scope));
    }
    return {tokens: output, title, scopes};
}

// Older native hosts expose string-only attributes. Materialization preserves
// that representation: it copies native attributes and never adds numeric ones.
interface StringAttributeToken extends Token {
    children: StringAttributeToken[] | null;
    attrs: [string, string][] | null;
    attrGet(name: string): string | null;
}

/**
 * Copy one admitted occurrence, retaining reachable local footnote definitions.
 * Does not parse, render, replay resources, or invoke the ID generator.
 * @param allTokens - Original parsed source tokens (including unselected definitions).
 * @param selectedTokens - Optional subset retaining original top-level token identities.
 * @param insertionToken - Actual include placeholder; privately inherits footnote-body provenance.
 * @returns Independent occurrences, or the unchanged selection when neither footnotes nor body inheritance apply.
 * @throws When a selection cuts a footnote section or contains copied source tokens.
 */
export function materializeFootnoteTokens(
    allTokens: StringAttributeToken[],
    selectedTokens?: StringAttributeToken[],
    insertionToken?: Token,
): StringAttributeToken[];
export function materializeFootnoteTokens(
    allTokens: Token[],
    selectedTokens?: Token[],
    insertionToken?: Token,
): Token[];
export function materializeFootnoteTokens(
    allTokens: Token[],
    selectedTokens: Token[] = allTokens,
    insertionToken?: Token,
): Token[] {
    if (!selectedTokens.every((token) => allTokens.includes(token))) {
        throw new TypeError('Selection must retain actual source-token identities');
    }
    const inheritBody = insertionToken !== undefined && isFootnoteBody(insertionToken);
    if (!hasFootnoteTokens(allTokens)) {
        if (!inheritBody) return selectedTokens;
        const copies = selectedTokens.map((token) => copyToken(token));
        markFootnoteBody(copies);
        return copies;
    }
    const occurrences = new Map<Scope, Scope>();
    const mapScope = (scope: Scope) => {
        if (!scope) throw new Error('Missing source scope');
        const known = occurrences.get(scope);
        if (known) return known;
        const occurrence = {origin: origin(scope), definitions: origin(scope).definitions};
        occurrences.set(scope, occurrence);
        return occurrence;
    };
    const result = completeForest(selectedTokens, [], mapScope).tokens;
    if (inheritBody) markFootnoteBody(result);
    const sourceOutput = sourceScope(allTokens)?.rawOutput;
    if (sourceOutput) {
        // The same pure helper can admit a selected standalone raw output.
        // Keep the exact generator reference but never reuse the source output's
        // namespace or invoke the callback during materialization.
        const outputScope: Scope = {definitions: new Map()};
        outputScope.rawOutput = {rootScope: outputScope, generateID: sourceOutput.generateID};
        Object.defineProperty(result, SOURCE_SCOPE, {value: outputScope});
    }
    return result;
}

function encodeNamespace(value: string): string {
    return `yfm-fn-${Array.from(String(value), (char) => (char.codePointAt(0) ?? 0).toString(16)).join('_') || 'empty'}`;
}

function namespaceCandidate(service: FootnoteService): string {
    if (service.namespace) return service.namespace;

    return encodeNamespace(service.generateID());
}

function applyPlan(forest: Forest, namespace: string, rootScope: Scope) {
    let nextScope = 1;
    const ordinals = new Map<Scope, number>();
    if (rootScope) ordinals.set(rootScope, 0);
    for (const scope of forest.scopes.keys()) {
        if (!ordinals.has(scope)) ordinals.set(scope, nextScope++);
    }
    const authoredIds = new Set<string>();
    walk([...forest.title, ...forest.tokens], (token) => {
        const id = token.attrGet('id');
        if (id) authoredIds.add(String(id));
    });
    walk([...forest.title, ...forest.tokens], (token) => {
        if (!['footnote_ref', 'footnote_open', 'footnote_anchor'].includes(token.type)) return;
        const scope = requireScope(token);
        const note = forest.scopes.get(scope)?.get(noteId(token));
        if (!note) throw new Error('Missing planned footnote');
        const body = `${namespace}-s${ordinals.get(scope)}-n${noteId(token) + 1}`;
        const ref = `${body}-r${subId(token) + 1}`;
        if (authoredIds.has(body) || authoredIds.has(ref)) {
            throw new Error('An authored id collides with a generated footnote id');
        }
        setOwnedData(token, {
            ...ownedData(token),
            plan: {
                body,
                ref,
                caption: note.caption,
                reference: subId(token) + 1,
            },
        });
    });
}

export function bindFootnoteRoot(
    env: ParserEnv,
    tokens: Token[],
    generateID: (() => string) | undefined,
    renderInline?: boolean,
) {
    const scope = sourceScope(tokens);
    const service = scope?.rawOutput;
    if (!scope || !service) return;
    setFootnoteService(env, service);
    scope.rawOutput = service;
    service.rootScope = scope;
    if (generateID) service.generateID = generateID; // The exact caller function: no clone, reset, wrapping, or replacement.
    service.renderInline = Boolean(renderInline);
}

export function prepareFootnoteTitle<Options>(
    md: FootnoteRenderer<Options>,
    env: ParserEnv,
    titleTokens: Token[],
    bodyTokens: Token[],
    overriddenByNeedTitle = false,
): string {
    const service = footnoteService(env);
    if (!service) return md.renderer.render(titleTokens, md.options, env);
    if (overriddenByNeedTitle) {
        // Preserve the established later needTitle precedence. The discarded
        // first H1 is not part of the final output's reference forest.
        service.titleTokens = undefined;
        return md.renderer.render(literalRefs(titleTokens), md.options, env);
    }
    service.titleTokens = titleTokens;
    if (service.renderInline) return md.renderer.render(literalRefs(titleTokens), md.options, env);
    let titleHasReferences = false;
    walk(titleTokens, (token) => {
        if (token.type === 'footnote_ref') titleHasReferences = true;
    });
    if (!titleHasReferences) {
        const html = md.renderer.render(titleTokens, md.options, env);
        service.titlePlanKey = '[]';
        return html;
    }
    const forest = completeForest(bodyTokens, titleTokens);
    if (!forest.scopes.size) return md.renderer.render(titleTokens, md.options, env);
    const namespace = namespaceCandidate(service);
    applyPlan(forest, namespace, service.rootScope);
    const title = md.renderer.render(forest.title, md.options, env);
    service.namespace = namespace;
    service.titlePlanKey = titlePlanKey(forest.title);
    service.publishedTitle = title;
    const titleReferenceIds: string[] = [];
    service.titleReferenceIds = titleReferenceIds;
    walk(forest.title, (token) => {
        if (token.type === 'footnote_ref') titleReferenceIds.push(requirePlan(token).ref);
    });
    return title;
}

function titlePlanKey(tokens: Token[]): string {
    const plans: unknown[] = [];
    walk(tokens, (token) => {
        if (token.type === 'footnote_ref') plans.push(requirePlan(token));
    });
    return JSON.stringify(plans);
}

function literalRefs(tokens: Token[]): Token[] {
    return tokens.map((token) => copyToken(token, (scope) => scope, token.type, true));
}

export function compileFootnoteOutput<Options>(
    md: FootnoteRenderer<Options>,
    env: ParserEnv,
    tokens: Token[],
    renderBody: RenderBody,
    generateID: () => string,
    renderInline = false,
): string {
    const service = footnoteService(env);
    if (service) return compileWithService(md, env, tokens, renderBody, service);
    if (!hasFootnoteTokens(tokens)) return renderBody(tokens);
    // A previously plain owned root may receive a materialized child later.
    // Commit the optional service only after rendering succeeds.
    const candidate: FootnoteService = {
        rootScope: {definitions: new Map()},
        generateID,
        renderInline,
    };
    const result = compileWithService(md, env, tokens, renderBody, candidate);
    setFootnoteService(env, candidate);
    return result;
}

export function compileWithService<Options>(
    md: FootnoteRenderer<Options>,
    env: ParserEnv,
    tokens: Token[],
    renderBody: RenderBody,
    service: FootnoteService,
): string {
    if (service.renderInline) {
        return renderBody(literalRefs(removeSections(tokens, (scope) => scope).filter(isToken)));
    }
    // A changed public title is caller-owned opaque HTML. Do not recreate the
    // previous generated title or emit backlinks to its removed references.
    const callerOwnsTitle =
        service.publishedTitle !== undefined && env.title !== service.publishedTitle;
    if (callerOwnsTitle && typeof env.title === 'string') {
        for (const id of service.titleReferenceIds ?? []) {
            if (env.title.includes(`id="${id}"`) || env.title.includes(`href="#${id}"`)) {
                throw new Error('An overridden title must replace generated footnote references');
            }
        }
    }
    const titleTokens = callerOwnsTitle ? [] : (service.titleTokens ?? []);
    const forest = completeForest(tokens, titleTokens);
    if (!forest.scopes.size) return renderBody(forest.tokens);
    // Plan validation finishes before an opaque callback is consumed.
    const namespace = namespaceCandidate(service);
    applyPlan(forest, namespace, service.rootScope);
    const nextTitlePlanKey = titlePlanKey(forest.title);
    // The reserved root ordinal keeps the usual title binding stable. Avoid
    // replaying unrelated caller renderer effects on every compile.
    const nextTitle =
        !callerOwnsTitle && service.titleTokens && service.titlePlanKey !== nextTitlePlanKey
            ? md.renderer.render(forest.title, md.options, env)
            : undefined;
    const result = renderBody(forest.tokens);
    // Rendering/sanitization must both succeed before document-owned data commits.
    if (nextTitle !== undefined) {
        env.title = nextTitle;
        service.publishedTitle = nextTitle;
    }
    service.namespace = namespace;
    service.titlePlanKey = nextTitlePlanKey;
    return result;
}

import type {ParserEnv} from '../src/transform/typings';

import {normalizeDocumentResources} from '../src/transform/document-context-core';

describe('CSP resource normalization', () => {
    it('deduplicates reordered records while preserving the first record and its source order', () => {
        const first = {
            'style-src': ['https://z.example', 'https://a.example', 'https://z.example'],
            'script-src': ['https://😀.example', 'https://é.example', "'self'"],
        };
        const original = structuredClone(first);
        const reordered = Object.fromEntries(
            Object.entries(first)
                .reverse()
                .map(([key, values]) => [key, [...values].reverse()]),
        );
        const env: ParserEnv = {meta: {csp: [first, reordered]}};

        normalizeDocumentResources(env);

        expect(env.meta?.csp).toEqual([
            {
                'style-src': ['https://z.example', 'https://a.example'],
                'script-src': ['https://😀.example', 'https://é.example', "'self'"],
            },
        ]);
        expect(Object.keys(env.meta?.csp?.[0] ?? {})).toEqual(['style-src', 'script-src']);
        expect(first).toEqual(original);
    });

    it('keeps records with distinct exact source strings separate', () => {
        const records = ['é', 'e\u0301', 'A', 'a', '😀', '\ue000'].map((source) => ({
            'script-src': [source],
        }));
        const env: ParserEnv = {meta: {csp: records}};

        normalizeDocumentResources(env);

        expect(env.meta?.csp).toEqual(records);
    });
});

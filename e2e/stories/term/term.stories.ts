import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/Term'};

export const BasicTerm: MarkdownSnippetStory = {
    name: 'Basic term reference',
    args: {
        snippet: dedent`
            The [HTML](*html) specification is maintained by the W3C.

            [*html]: HyperText Markup Language
        `,
    },
};

export const AsteriskInText: MarkdownSnippetStory = {
    name: 'Asterisk inside term text',
    args: {
        snippet: dedent`
            Operators: [<=](*lteq), [=*](*eqtimes), [>=](*gteq).

            [*lteq]: less than or equal

            [*eqtimes]: equals with wildcard search

            [*gteq]: greater than or equal
        `,
    },
};

export const TermInSuperscript: MarkdownSnippetStory = {
    name: 'Term inside superscript',
    args: {
        snippet: dedent`
            Some text ^[?](*popup1)^ with a superscript term.

            [*popup1]: This is a popup definition
        `,
    },
};

export const MultipleTerms: MarkdownSnippetStory = {
    name: 'Multiple terms in one paragraph',
    args: {
        snippet: dedent`
            Use [CSS](*css) to style your [HTML](*html) pages.

            [*css]: Cascading Style Sheets

            [*html]: HyperText Markup Language
        `,
    },
};

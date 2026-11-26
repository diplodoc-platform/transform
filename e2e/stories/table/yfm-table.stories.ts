import type {MarkdownSnippetStory} from '../../fixtures/utils/storyMeta';

import dedent from 'ts-dedent';

import {getSnippetMeta} from '../../fixtures/utils/storyMeta';

export default {...getSnippetMeta(), title: 'Builtins/table/Multiline Table'};

export const Base: MarkdownSnippetStory = {
    name: 'Base',
    args: {
        snippet: dedent`
            #|
            || A | B | C ||
            || D | E | F ||
            || G | H | I ||
            || J | K | L ||
            || M | N | O ||
            || P | Q | R ||
            || S | T | U ||
            |#
            `,
    },
};

export const NoStipeRows: MarkdownSnippetStory = {
    name: 'Without stripe rows',
    args: {
        additionalRootClassnames: ['yfm_no-stripe-table'],
        snippet: dedent`
            #|
            || A | B | C ||
            || D | E | F ||
            || G | H | I ||
            || J | K | L ||
            || M | N | O ||
            || P | Q | R ||
            || S | T | U ||
            |#
            `,
    },
};

export const WithOneHeaderRow: MarkdownSnippetStory = {
    name: 'With one header row',
    args: {
        additionalRootClassnames: ['yfm_no-stripe-table'],
        snippet: dedent`
            #|
            |:{header-rows="1"}
            || A | B | C ||
            || D | E | F ||
            || G | H | I ||
            || J | K | L ||
            || M | N | O ||
            || P | Q | R ||
            || S | T | U ||
            |#
            `,
    },
};

export const WithThreeHeaderRows: MarkdownSnippetStory = {
    name: 'With three header rows',
    args: {
        additionalRootClassnames: ['yfm_no-stripe-table'],
        snippet: dedent`
            #|
            |:{header-rows="3"}
            || A | B | C ||
            || D | E | F ||
            || G | H | I ||
            || J | K | L ||
            || M | N | O ||
            || P | Q | R ||
            || S | T | U ||
            |#
            `,
    },
};

export const WithHeaderRowsAndCellBg: MarkdownSnippetStory = {
    name: 'With header rows and cell background',
    args: {
        additionalRootClassnames: ['yfm_no-stripe-table'],
        snippet: dedent`
            #|
            |:{header-rows="3"}
            ||::{bg="red"} A | B | C ||
            || D |::{bg="green" align="top-left"} E | F ||
            || G | H |::{bg="blue"} I {.cell-align-bottom-left}||
            || J | K | L ||
            || M | N | O ||
            || P | Q | R ||
            || S | T | U ||
            |#
            `,
    },
};

export const IndependentAlignment: MarkdownSnippetStory = {
    name: 'Independent cell alignment',
    args: {
        snippet: dedent`
            #|
            |:{header-rows="1"}
            ||::{halign="start" valign="top"} **Header** |::{halign="center" valign="center"} **Header** |::{halign="end" valign="bottom"} **Header** ||
            ||::{halign="start" valign="top"} **Body** |::{halign="center" valign="center"} **Body** |::{halign="end" valign="bottom"} **Body** ||
            ||::{align="bottom-right" halign="start"} **Horizontal** |::{align="top-left" valign="bottom"} **Vertical** |::{halign="end" valign="center"} **Both** {.cell-align-top-left} ||
            |#
        `,
    },
};

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

export const WithColWidths: MarkdownSnippetStory = {
    name: 'With column widths',
    args: {
        snippet: dedent`
            #|
            |:{widths="150px 200px 250px"}
            ||
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam consectetur ex a nisi volutpat, consequat imperdiet lorem viverra. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.
            |
            Nullam faucibus elementum ipsum sit amet ultricies. Aenean venenatis, nulla eleifend sagittis laoreet, augue velit rutrum metus, non faucibus orci erat nec ligula. Mauris justo est, egestas vel nisi vel, faucibus gravida neque.
            |
            Fusce consequat turpis id efficitur mollis. Vivamus facilisis, lorem non commodo gravida, erat lorem tempor dui, dapibus malesuada dui turpis quis augue. Maecenas quis lorem neque. Nunc eget dui ac ligula ornare convallis non id urna.
            ||
            |#
            `,
    },
};

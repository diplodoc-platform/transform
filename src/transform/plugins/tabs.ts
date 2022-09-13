import StateCore from 'markdown-it/lib/rules_core/state_core';
import Token from 'markdown-it/lib/token';
import {MarkdownItPluginCb} from './typings';
import {generateID} from './utils';

const TAB_RE = /`?{% list (tabs) %}`?/;

type Tab = {
    name: string;
    tokens: Token[];
};

function findTabs(tokens: Token[], idx: number) {
    const tabs = [];
    let i = idx,
        nestedLevel = -1,
        pending: Tab = {name: '', tokens: []};

    while (i < tokens.length) {
        const token = tokens[i];

        switch (token.type) {
            case 'ordered_list_open':
            case 'bullet_list_open':
                if (nestedLevel > -1) {
                    pending.tokens.push(token);
                }
                nestedLevel++;
                break;
            case 'list_item_open':
                if (nestedLevel) {
                    pending.tokens.push(token);
                } else {
                    pending = {name: '', tokens: []};
                }
                break;
            case 'list_item_close':
                if (nestedLevel) {
                    pending.tokens.push(token);
                } else {
                    tabs.push(pending);
                }
                break;
            case 'ordered_list_close':
            case 'bullet_list_close':
                if (!nestedLevel) {
                    return {
                        tabs,
                        index: i,
                    };
                }

                nestedLevel--;

                pending.tokens.push(token);

                break;
            case 'paragraph_open':
                if (
                    !pending &&
                    tokens[i + 1].content &&
                    tokens[i + 1].content.trim() === '{% endlist %}'
                ) {
                    return {
                        tabs,
                        index: i + 2,
                    };
                }

                if (!pending.name && tokens[i + 1].type === 'inline') {
                    pending.name = tokens[i + 1].content;
                    i += 2;
                } else {
                    pending.tokens.push(token);
                }
                break;
            default:
                pending.tokens.push(token);
        }

        i++;
    }

    return {
        tabs,
        index: i,
    };
}

function insertTabs(tabs: Tab[], state: StateCore, start: number, end: number) {
    const tabsTokens = [];
    const tabListTokens = [];
    const tabPanelsTokens = [];
    const tabsOpen = new state.Token('tabs_open', 'div', 1);
    const tabsClose = new state.Token('tabs_close', 'div', -1);
    const tabListOpen = new state.Token('tab-list_open', 'div', 1);
    const tabListClose = new state.Token('tab-list_close', 'div', -1);

    tabsOpen.block = true;
    tabsClose.block = true;
    tabListOpen.block = true;
    tabListClose.block = true;
    tabsOpen.attrSet('class', 'yfm-tabs');
    tabListOpen.attrSet('class', 'yfm-tab-list');
    tabListOpen.attrSet('role', 'tablist');

    for (let i = 0; i < tabs.length; i++) {
        const tabOpen = new state.Token('tab_open', 'div', 1);
        const tabInline = new state.Token('inline', '', 0);
        const tabText = new state.Token('text', '', 0);
        const tabClose = new state.Token('tab_close', 'div', -1);
        const tabPanelOpen = new state.Token('tab-panel_open', 'div', 1);
        const tabPanelClose = new state.Token('tab-panel_close', 'div', -1);

        const tabId = generateID();
        const tabPanelId = generateID();

        tabText.content = tabs[i].name;
        tabInline.children = [tabText];
        tabOpen.block = true;
        tabClose.block = true;
        tabPanelOpen.block = true;
        tabPanelClose.block = true;
        tabOpen.attrSet('id', tabId);
        tabOpen.attrSet('class', 'yfm-tab');
        tabOpen.attrSet('role', 'tab');
        tabOpen.attrSet('aria-controls', tabPanelId);
        tabOpen.attrSet('aria-selected', 'false');
        tabOpen.attrSet('tabindex', '-1');
        tabPanelOpen.attrSet('id', tabPanelId);
        tabPanelOpen.attrSet('class', 'yfm-tab-panel');
        tabPanelOpen.attrSet('role', 'tabpanel');
        tabPanelOpen.attrSet('aria-labelledby', tabId);
        tabPanelOpen.attrSet('data-title', tabs[i].name);

        if (i === 0) {
            tabOpen.attrJoin('class', 'active');
            tabOpen.attrSet('aria-selected', 'true');
            tabOpen.attrSet('tabindex', '0');
            tabPanelOpen.attrJoin('class', 'active');
        }

        tabListTokens.push(tabOpen, tabInline, tabClose);
        tabPanelsTokens.push(tabPanelOpen, ...tabs[i].tokens, tabPanelClose);
    }

    tabsTokens.push(tabsOpen);
    tabsTokens.push(tabListOpen);
    tabsTokens.push(...tabListTokens);
    tabsTokens.push(tabListClose);
    tabsTokens.push(...tabPanelsTokens);
    tabsTokens.push(tabsClose);

    state.tokens.splice(start, end - start + 1, ...tabsTokens);

    return tabsTokens.length;
}

function findCloseTokenIdx(tokens: Token[], idx: number) {
    let level = 0;
    let i = idx;
    while (i < tokens.length) {
        if (matchOpenToken(tokens, i)) {
            level++;
        } else if (matchCloseToken(tokens, i)) {
            if (level === 0) {
                return i;
            }
            level--;
        }

        i++;
    }

    return null;
}

function matchCloseToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endlist %}'
    );
}

function matchOpenToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(TAB_RE)
    );
}

const tabs: MarkdownItPluginCb = (md) => {
    const plugin = (state: StateCore) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const match = matchOpenToken(tokens, i);
            const openTag = match && match[0];
            const isNotEscaped = openTag && !(openTag.startsWith('`') && openTag.endsWith('`'));

            if (!match || !isNotEscaped) {
                i++;
                continue;
            }

            const closeTokenIdx = findCloseTokenIdx(tokens, i + 3);

            if (!closeTokenIdx) {
                tokens[i].attrSet('YFM005', 'true');
                i += 3;
                continue;
            }

            const {tabs, index} = findTabs(state.tokens, i + 3);

            if (tabs.length > 0) {
                i += insertTabs(tabs, state, i, index + 3);
            } else {
                state.tokens.splice(i, index - i);
            }
        }
    };

    try {
        md.core.ruler.before('curly_attributes', 'tabs', plugin);
    } catch (e) {
        md.core.ruler.push('tabs', plugin);
    }
};

export = tabs;

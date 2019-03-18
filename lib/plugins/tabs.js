'use strict';

const TAB_RE = /{% list (tabs) %}/;

function generateID() {
    return Math.random().toString(36).substr(2, 8);
}

function findTabs(tokens, idx) {
    const tabs = [];
    let i = idx,
        nestedLevel = -1,
        pending;

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
                if (!nestedLevel) {
                    pending = {tokens: []};
                } else {
                    pending.tokens.push(token);
                }
                break;
            case 'list_item_close':
                if (!nestedLevel) {
                    tabs.push(pending);
                } else {
                    pending.tokens.push(token);
                }
                break;
            case 'ordered_list_close':
            case 'bullet_list_close':
                if (!nestedLevel) {
                    return {
                        tabs,
                        index: i
                    };
                }

                nestedLevel--;

                pending.tokens.push(token);

                break;
            case 'paragraph_open':
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
        index: i
    };
}

function insertTabs(tabs, state, start, end) {
    const tabsTokens = [];
    const tabListTokens = [];
    const tabPanelsTokens = [];
    const tabsOpen = new state.Token('tabs_open', 'div', 1);
    const tabsClose = new state.Token('tabs_open', 'div', -1);
    const tabListOpen = new state.Token('tab-list_open', 'div', 1);
    const tabListClose = new state.Token('tab-list_open', 'div', -1);

    tabsOpen.block = true;
    tabsClose.block = true;
    tabListOpen.block = true;
    tabListClose.block = true;
    tabsOpen.attrSet('class', 'tabs');
    tabListOpen.attrSet('class', 'tab-list');
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
        tabOpen.attrSet('class', 'tab');
        tabOpen.attrSet('role', 'tab');
        tabOpen.attrSet('aria-controls', tabPanelId);
        tabOpen.attrSet('aria-selected', false);
        tabOpen.attrSet('tabindex', -1);
        tabPanelOpen.attrSet('id', tabPanelId);
        tabPanelOpen.attrSet('class', 'tab-panel');
        tabPanelOpen.attrSet('role', 'tabpanel');
        tabPanelOpen.attrSet('aria-labelledby', tabId);
        tabPanelOpen.attrSet('data-title', tabs[i].name);

        if (i === 0) {
            tabOpen.attrJoin('class', 'active');
            tabOpen.attrSet('aria-selected', true);
            tabOpen.attrSet('tabindex', 0);
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

function tabs(md) {
    md.core.ruler.before('curly_attributes', 'tabs', (state) => {
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            if (
                tokens[i].type === 'paragraph_open' &&
                tokens[i + 1].type === 'inline'
            ) {
                const match = tokens[i + 1].content.match(TAB_RE);

                if (match) {
                    const {tabs, index} = findTabs(state.tokens, i + 3);

                    if (tabs.length > 0 && index) {
                        i += insertTabs(tabs, state, i, index + 3);
                        continue;
                    }
                }
            }

            i++;
        }
    });
}

module.exports = tabs;

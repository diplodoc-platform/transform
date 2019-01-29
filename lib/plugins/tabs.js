'use strict';

const TAB_RE = /^\*\*\[!TAB (.+)]\*\*$/;

function generateID() {
    return Math.random().toString(36).substr(2, 8);
}

function findTabs(tokens, idx) {
    const tabs = [];
    let i = idx,
        closingIndex,
        pending;

    while (i < tokens.length) {
        let match;
        const isTab = tokens[i].type === 'paragraph_open' && Boolean(match = tokens[i + 1].content.match(TAB_RE));
        const isHorizontalRule = tokens[i].type === 'hr';

        if (isTab || isHorizontalRule) {
            // Add pending tab to the list
            if (pending) {
                tabs.push(pending);
            }

            // If it's a closing "hr" we return the list and the index where we stopped
            if (isHorizontalRule) {
                closingIndex = i;
                break;
            }

            // It's a new tab so it becomes a new pending
            pending = {name: match[1], tokens: []};
            i += 3; // Skip next "inline" and "paragraph_close" tokens
        } else if (pending) { // If there's a pending tab then the current token is a part of the pending tab tokens
            pending.tokens.push(tokens[i]);
            i++;
        } else { // Otherwise it's not a tab list
            break;
        }
    }

    return {
        tabs,
        index: closingIndex
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
    md.core.ruler.push('tabs', (state) => {
        let i = 0;

        while (i < state.tokens.length) {
            const token = state.tokens[i];

            if (token.type === 'hr') {
                const {tabs, index} = findTabs(state.tokens, i + 1);

                if (tabs.length > 0 && index) {
                    i += insertTabs(tabs, state, i, index);
                    continue;
                }
            }

            i++;
        }
    });
}

module.exports = tabs;

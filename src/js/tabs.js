const Selector = {
    TABS: '.yfm .tabs',
    TAB_LIST: '.yfm .tab-list',
    TAB: '.yfm .tab',
    TAB_PANEL: '.yfm .tab-panel'
};

const ClassName = {
    ACTIVE: 'active'
};

function selectTab(element) {
    if (
        !element.parentNode ||
        !element.parentNode.matches(Selector.TAB_LIST) ||
        !element.parentNode.parentNode ||
        !element.parentNode.parentNode.matches(Selector.TABS) ||
        element.classList.contains(ClassName.ACTIVE)
    ) {
        return;
    }

    const tab = element;
    const tabList = tab.parentNode;
    const tabsContainer = tabList.parentNode;
    const allTabs = Array.from(tabsContainer.querySelectorAll(Selector.TAB));
    const allPanels = Array.from(tabsContainer.querySelectorAll(Selector.TAB_PANEL));
    const targetIndex = allTabs.indexOf(tab);

    for (let i = 0; i < allTabs.length; i++) {
        const tab = allTabs[i];
        const panel = allPanels[i];

        if (i === targetIndex) {
            tab.classList.toggle(ClassName.ACTIVE, true);
            tab.setAttribute('aria-selected', true);
            tab.setAttribute('tabindex', 0);
            panel.classList.toggle(ClassName.ACTIVE, true);
        } else {
            tab.classList.toggle(ClassName.ACTIVE, false);
            tab.setAttribute('aria-selected', false);
            tab.setAttribute('tabindex', -1);
            panel.classList.toggle(ClassName.ACTIVE, false);
        }
    }


}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (!event.target.matches(Selector.TAB)) {
            return;
        }

        selectTab(event.target);
    });
}

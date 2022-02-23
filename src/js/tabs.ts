import {isCustom, getEventTarget} from './utils';

const Selector = {
    TABS: '.yfm .yfm-tabs',
    TAB_LIST: '.yfm .yfm-tab-list',
    TAB: '.yfm .yfm-tab',
    TAB_PANEL: '.yfm .yfm-tab-panel',
};

const ClassName = {
    ACTIVE: 'active',
};

function selectTab(element: HTMLElement) {
    const parentNode = element.parentNode as HTMLElement;
    if (
        !parentNode ||
        !parentNode.matches(Selector.TAB_LIST) ||
        !parentNode.parentNode ||
        !(parentNode.parentNode as HTMLElement).matches(Selector.TABS) ||
        element.classList.contains(ClassName.ACTIVE)
    ) {
        return;
    }

    const tab = element;
    const tabList = tab.parentNode;
    const tabsContainer = tabList?.parentNode;
    const allTabs = Array.from(tabsContainer?.querySelectorAll(Selector.TAB) || []);
    const allPanels = Array.from(tabsContainer?.querySelectorAll(Selector.TAB_PANEL) || []);
    const targetIndex = allTabs.indexOf(tab);

    for (let i = 0; i < allTabs.length; i++) {
        const tab = allTabs[i];
        const panel = allPanels[i];

        if (i === targetIndex) {
            tab.classList.toggle(ClassName.ACTIVE, true);
            tab.setAttribute('aria-selected', 'true');
            tab.setAttribute('tabindex', '0');
            panel.classList.toggle(ClassName.ACTIVE, true);
        } else {
            tab.classList.toggle(ClassName.ACTIVE, false);
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
            panel.classList.toggle(ClassName.ACTIVE, false);
        }
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const target = getEventTarget(event) as HTMLElement;

        if (isCustom(event) || !target.matches(Selector.TAB)) {
            return;
        }

        selectTab(target);
    });
}

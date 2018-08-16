(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

    var Selector = {
      TABS: '.yfm .tabs',
      TAB_LIST: '.yfm .tab-list',
      TAB: '.yfm .tab',
      TAB_PANEL: '.yfm .tab-panel'
    };
    var ClassName = {
      ACTIVE: 'active'
    };

    function selectTab(element) {
      if (!element.parentNode || !element.parentNode.matches(Selector.TAB_LIST) || !element.parentNode.parentNode || !element.parentNode.parentNode.matches(Selector.TABS) || element.classList.contains(ClassName.ACTIVE)) {
        return;
      }

      var tab = element;
      var tabList = tab.parentNode;
      var tabsContainer = tabList.parentNode;
      var allTabs = Array.from(tabsContainer.querySelectorAll(Selector.TAB));
      var allPanels = Array.from(tabsContainer.querySelectorAll(Selector.TAB_PANEL));
      var targetIndex = allTabs.indexOf(tab);

      for (var i = 0; i < allTabs.length; i++) {
        var _tab = allTabs[i];
        var panel = allPanels[i];

        if (i === targetIndex) {
          _tab.classList.toggle(ClassName.ACTIVE, true);

          _tab.setAttribute('aria-selected', true);

          _tab.setAttribute('tabindex', 0);

          panel.classList.toggle(ClassName.ACTIVE, true);
        } else {
          _tab.classList.toggle(ClassName.ACTIVE, false);

          _tab.setAttribute('aria-selected', false);

          _tab.setAttribute('tabindex', -1);

          panel.classList.toggle(ClassName.ACTIVE, false);
        }
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('click', function (event) {
        if (!event.target.matches(Selector.TAB)) {
          return;
        }

        selectTab(event.target);
      });
    }

})));

(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
}(function () { 'use strict';

    var Selector = {
      TABS: '.yfm .yfm-tabs',
      TAB_LIST: '.yfm .yfm-tab-list',
      TAB: '.yfm .yfm-tab',
      TAB_PANEL: '.yfm .yfm-tab-panel'
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
      // matches polyfill for old edge
      (function (e) {
        var matches = e.matches || e.matchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector || e.msMatchesSelector || e.oMatchesSelector;

        if (!matches) {
          e.matches = e.matchesSelector = function matches(selector) {
            var matches = document.querySelectorAll(selector);
            var th = this;
            return Array.prototype.some.call(matches, function (e) {
              return e === th;
            });
          };
        } else {
          e.matches = e.matchesSelector = matches;
        }
      })(Element.prototype);

      document.addEventListener('click', function (event) {
        if (!event.target.matches(Selector.TAB)) {
          return;
        }

        selectTab(event.target);
      });
    }

}));

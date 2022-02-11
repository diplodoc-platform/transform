(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
})((function () { 'use strict';

  var isImplemented$1 = function isImplemented() {
    return Object.prototype.hasOwnProperty.call(Node.prototype, 'getRootNode');
  };

  var getRootNodePolyfill = {exports: {}};

  (function (module) {

  // Node getRootNode(optional GetRootNodeOptions options);

  /**
   * Returns the context object’s shadow-including root if options’s composed is true.
   * Returns the context object’s root otherwise.
   *
   * The root of an object is itself, if its parent is null, or else it is the root of its parent.
   *
   * The shadow-including root of an object is its root’s host’s shadow-including root,
   * if the object’s root is a shadow root, and its root otherwise.
   *
   * https://dom.spec.whatwg.org/#dom-node-getrootnode
   *
   * @memberof Node.prototype
   * @param {!Object} [opt = {}] - Options.
   * @param {!boolean} [opt.composed] - See above description.
   * @returns {!Node} The root node.
   */
  function getRootNode(opt) {
    var composed = typeof opt === 'object' && Boolean(opt.composed);

    return composed ? getShadowIncludingRoot(this) : getRoot(this);
  }

  function getShadowIncludingRoot(node) {
    var root = getRoot(node);

    if (isShadowRoot(root)) {
      return getShadowIncludingRoot(root.host);
    }

    return root;
  }

  function getRoot(node) {
    if (node.parentNode != null) {
      return getRoot(node.parentNode);
    }

    return node;
  }

  function isShadowRoot(node) {
    return node.nodeName === '#document-fragment' && node.constructor.name === 'ShadowRoot';
  }

  if (module.exports) {
    module.exports = getRootNode;
  }
  }(getRootNodePolyfill));

  var isImplemented = isImplemented$1;

  if (!isImplemented()) {
    Object.defineProperty(Node.prototype, 'getRootNode', {
      enumerable: false,
      configurable: false,
      value: getRootNodePolyfill.exports,
    });
  }

  if (typeof document !== 'undefined') {
    // matches polyfill for old edge
    (function (e) {
      var matches = e.matches || e.matchesSelector || e.webkitMatchesSelector || e.mozMatchesSelector || e.msMatchesSelector || e.oMatchesSelector;

      if (matches) {
        e.matches = e.matchesSelector = matches;
      } else {
        e.matches = e.matchesSelector = function matches(selector) {
          var matches = e.getRootNode().querySelectorAll(selector);
          var th = this;
          return Array.prototype.some.call(matches, function (e) {
            return e === th;
          });
        };
      }
    })(Element.prototype);
  }

  var getEventTarget = function getEventTarget(event) {
    var path = event.composedPath();
    return Array.isArray(path) && path.length > 0 ? path[0] : event.target;
  };
  var isCustom = function isCustom(event) {
    var target = getEventTarget(event);
    return !target || !target.matches;
  };

  var Selector$1 = {
    TABS: '.yfm .yfm-tabs',
    TAB_LIST: '.yfm .yfm-tab-list',
    TAB: '.yfm .yfm-tab',
    TAB_PANEL: '.yfm .yfm-tab-panel'
  };
  var ClassName$1 = {
    ACTIVE: 'active'
  };

  function selectTab(element) {
    if (!element.parentNode || !element.parentNode.matches(Selector$1.TAB_LIST) || !element.parentNode.parentNode || !element.parentNode.parentNode.matches(Selector$1.TABS) || element.classList.contains(ClassName$1.ACTIVE)) {
      return;
    }

    var tab = element;
    var tabList = tab.parentNode;
    var tabsContainer = tabList.parentNode;
    var allTabs = Array.from(tabsContainer.querySelectorAll(Selector$1.TAB));
    var allPanels = Array.from(tabsContainer.querySelectorAll(Selector$1.TAB_PANEL));
    var targetIndex = allTabs.indexOf(tab);

    for (var i = 0; i < allTabs.length; i++) {
      var _tab = allTabs[i];
      var panel = allPanels[i];

      if (i === targetIndex) {
        _tab.classList.toggle(ClassName$1.ACTIVE, true);

        _tab.setAttribute('aria-selected', true);

        _tab.setAttribute('tabindex', 0);

        panel.classList.toggle(ClassName$1.ACTIVE, true);
      } else {
        _tab.classList.toggle(ClassName$1.ACTIVE, false);

        _tab.setAttribute('aria-selected', false);

        _tab.setAttribute('tabindex', -1);

        panel.classList.toggle(ClassName$1.ACTIVE, false);
      }
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (event) {
      var target = getEventTarget(event);

      if (isCustom(event) || !target.matches(Selector$1.TAB)) {
        return;
      }

      selectTab(target);
    });
  }

  var BUTTON_SELECTOR = '.yfm-clipboard-button';

  function copyToClipboard(text) {
    if (!text) {
      return Promise.resolve();
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    var textarea = document.createElement('textarea');
    textarea.setAttribute('style', 'position: absolute; left: 1000%');
    textarea.textContent = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function notifySuccess(svgButton) {
    if (!svgButton) {
      return;
    }

    var id = svgButton.getAttribute('data-animation');
    var icon = svgButton.getRootNode().getElementById("visibileAnimation-" + id);

    if (!icon) {
      return;
    }

    icon.beginElement();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (event) {
      var target = getEventTarget(event);

      if (isCustom(event) || !target.matches(BUTTON_SELECTOR)) {
        return;
      }

      var parent = target.parentNode;

      if (!parent) {
        return;
      }

      var code = parent.querySelector('pre code');

      if (!code) {
        return;
      }

      copyToClipboard(code.innerText).then(function () {
        notifySuccess(parent.querySelector('.yfm-clipboard-button'));
      });
    });
  }

  var Selector = {
    CUT: '.yfm .yfm-cut',
    TITLE: '.yfm .yfm-cut-title',
    CONTENT: '.yfm .yfm-cut-content'
  };
  var ClassName = {
    OPEN: 'open'
  };

  function toggleCut(element) {
    var cutEl = element.parentNode;
    cutEl.classList.toggle(ClassName.OPEN);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function (event) {
      var target = getEventTarget(event);

      if (isCustom(event) || !target.matches(Selector.TITLE)) {
        return;
      }

      toggleCut(target);
    });
  }

}));

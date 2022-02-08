if (typeof document !== 'undefined') {
    // matches polyfill for old edge
    (function (e) {
        const matches =
            e.matches ||
            e.matchesSelector ||
            e.webkitMatchesSelector ||
            e.mozMatchesSelector ||
            e.msMatchesSelector ||
            e.oMatchesSelector;

        if (matches) {
            e.matches = e.matchesSelector = matches;
        } else {
            e.matches = e.matchesSelector = function matches(selector) {
                const matches = document.querySelectorAll(selector);
                const th = this;
                return Array.prototype.some.call(matches, (e) => {
                    return e === th;
                });
            };
        }
    })(Element.prototype);
}

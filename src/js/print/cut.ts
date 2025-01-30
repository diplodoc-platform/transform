const Selector = {
    CUT_ROOT: '.yfm details.yfm-cut',
};

function openCuts() {
    document.querySelectorAll(Selector.CUT_ROOT).forEach((element) => {
        element.setAttribute('open', 'true');
        element.classList.add('open');
    });
}

if (typeof document !== 'undefined') {
    window.addEventListener('load', () => {
        openCuts();
    });
}

export {};

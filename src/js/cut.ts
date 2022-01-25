import {isCustom} from './utils';

const Selector = {
    CUT: '.yfm .yfm-cut',
    TITLE: '.yfm .yfm-cut-title',
    CONTENT: '.yfm .yfm-cut-content',
};

const ClassName = {
    OPEN: 'open',
};

function toggleCut(element: HTMLElement) {
    const cutEl = element.parentNode as HTMLElement;
    cutEl.classList.toggle(ClassName.OPEN);
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (isCustom(event) || !(event.target as HTMLElement).matches(Selector.TITLE)) {
            return;
        }

        toggleCut(event.target as HTMLElement);
    });
}

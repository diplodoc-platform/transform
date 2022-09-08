import debounce from 'debounce';

const Selector = {
    TABLE: '.yfm-table-container table',
};
const Padding = {
    BOTTOM: 20,
};

function resizeElement(element: HTMLElement) {
    const availableWidth = element.parentElement?.offsetWidth;
    const contentWidth = (element.firstElementChild as HTMLElement).offsetWidth;

    if (!availableWidth) {
        return;
    }

    const needScale = contentWidth > availableWidth;

    if (needScale) {
        const scale = availableWidth / contentWidth;

        element.style.transform = `scale(${scale})`;
    }

    element.parentElement.style.height = `${
        element.getBoundingClientRect().height + Padding.BOTTOM
    }px`;
}

function resizeElements() {
    document.querySelectorAll(Selector.TABLE).forEach((element) => {
        resizeElement(element as HTMLElement);
    });
}

if (typeof document !== 'undefined') {
    window.addEventListener('resize', debounce(resizeElements, 200));

    window.addEventListener('load', () => {
        resizeElements();

        const observer = new MutationObserver(resizeElements);

        const rootEl = document.getElementById('root');
        if (rootEl) {
            observer.observe(rootEl, {childList: true, subtree: true});
        }
    });
}

export {};

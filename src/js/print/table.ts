const Selector = {
    WRAPPED_TABLE: '.pdf .yfm-table-container table',
    TABLE: '.pdf table',
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
    document.querySelectorAll(Selector.WRAPPED_TABLE).forEach((element) => {
        resizeElement(element as HTMLElement);
    });
}

function wrapTables() {
    const tables = document.querySelectorAll(Selector.TABLE);

    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];

        const parent = table.parentNode;

        if (!parent) {
            continue;
        }

        const wrapper = document.createElement('div');
        parent.insertBefore(wrapper, table);
        wrapper.appendChild(table);
        wrapper.classList.add('yfm-table-container');
    }
}

if (typeof document !== 'undefined') {
    window.addEventListener('load', () => {
        wrapTables();
        resizeElements();
    });
}

export {};

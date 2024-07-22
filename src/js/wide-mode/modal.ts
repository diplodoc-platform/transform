import closeIcon from './icons/close';

const remove = () => {
    if (!window.wideTemplate) {
        return;
    }

    window.wideTemplate.style.display = 'none';
    window.wideTemplate.content(undefined);
};

const tbodyOf = (node: HTMLElement) => {
    if (node.tagName !== 'TABLE') {
        return undefined;
    }

    const elements = Array.from(node.children);

    const thead = elements.find((child) => child.tagName === 'THEAD');

    if (thead) {
        return undefined;
    }

    const tbody = elements.find((child) => child.tagName === 'TBODY');

    return tbody;
};

type ModalContainer = NonNullable<typeof window.wideTemplate>;

/* @todo refactor to markup with innerHTML @v8tenko */

const container = () => {
    if (window.wideTemplate) {
        return window.wideTemplate;
    }

    const template = document.createElement('div') as ModalContainer;
    template.classList.add('dc-doc-page', 'wide-container');

    const overlay = document.createElement('div');
    overlay.classList.add('wide-content-overlay');
    overlay.addEventListener('click', remove);

    const wrapper = document.createElement('div');
    wrapper.classList.add('yfm', 'wide-content-wrapper');

    const toolbar = document.createElement('div');
    toolbar.classList.add('wide-toolbar');

    const close = document.createElement('div');
    close.classList.add('wide-actions');
    close.addEventListener('click', remove);
    close.innerHTML = closeIcon;

    const title = document.createElement('p');
    title.classList.add('wide-entity-name');

    template.label = (content: string) => {
        title.innerHTML = content;
    };

    const content = document.createElement('div');
    content.classList.add('wide-content');

    template.content = (target?: Element) => {
        if (typeof target === 'undefined') {
            content.innerHTML = '';

            return;
        }

        const cloned = target.cloneNode(true) as HTMLElement;

        const tbody = tbodyOf(cloned);

        /* used to stretch single tbody to 100% */
        tbody?.classList?.add('wide-thead-content');

        content.replaceChildren(cloned);
    };

    toolbar.append(title, close);
    wrapper.append(toolbar, content);
    template.append(overlay, wrapper);

    template.style.display = 'none';
    document.body.appendChild(template);

    window.wideTemplate = template;

    return template;
};

const render = (content: HTMLElement) => {
    const template = container();

    if (content.title) {
        template.label(content.title);
    }

    template.content(content);

    template.style.display = 'flex';
};

export const modal = {
    render,
    remove,
};

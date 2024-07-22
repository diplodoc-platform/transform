import {WIDE_ELEMENTS_SELECTOR} from './constants';
import expand from './icons/expand';
import {modal} from './modal';

const wrap = (target: HTMLElement) => {
    if (target.parentElement?.classList.contains('wide-element-wrapper')) {
        return;
    }

    target.classList.add('wide-inner-element');

    const handler = document.createElement('div');

    handler.innerHTML = expand;
    handler.classList.add('wide-content-viewer');
    handler.addEventListener('click', () => modal.render(target));

    const container = document.createElement('div');

    container.classList.add('wide-element-wrapper');

    target.before(container);

    container.appendChild(handler);
    container.appendChild(target);
};

export const applyWideMode = () => {
    const allWideElements = Array.from(
        document.querySelectorAll(WIDE_ELEMENTS_SELECTOR),
    ) as HTMLElement[];

    allWideElements.forEach(wrap);
};

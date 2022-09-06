import {getEventTarget, isCustom} from './utils';

const Selector = {
    CUT: '.yfm .yfm-cut',
    TITLE: '.yfm .yfm-cut-title',
    CONTENT: '.yfm .yfm-cut-content',
};

const ClassName = {
    OPEN: 'open',
};

function toggleCut(element: HTMLElement) {
    const cutNode = element.parentNode;

    if (!(cutNode instanceof HTMLElement)) {
        return;
    }

    cutNode.classList.toggle(ClassName.OPEN);
}

function matchTitle(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return target?.matches?.(Selector.TITLE);
}

function findTitleInPath(event: MouseEvent): HTMLElement | undefined {
    const target = getEventTarget(event);

    if (matchTitle(target)) {
        return target as HTMLElement;
    }

    const path = event.composedPath?.();

    return path?.find(matchTitle) as HTMLElement | undefined;
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (isCustom(event)) {
            return;
        }

        const title = findTitleInPath(event);

        if (!title) {
            return;
        }

        toggleCut(title);
    });
}

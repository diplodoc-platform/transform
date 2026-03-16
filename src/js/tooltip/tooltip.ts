import type {
    Coords,
    TooltipContext,
    TooltipContextElements,
    TooltipElementOptions,
    TooltipOptions,
} from './types';

import {
    DEFAULT_OFFSET_VALUES,
    PAGE_CONTAINER_SELECTOR,
    TOOLTIP_BASE_CLASS,
    TOOLTIP_DATA_ATTR,
    TOOLTIP_OPEN_CLASS,
} from './constant';
import {
    computePosition,
    convertToRelativeToOffsetParentRect,
    createRect,
    generateId,
    getElementRect,
    getViewportRect,
    updateRect,
} from './utils';

interface TooltipState {
    currentId: string | null;
    timer: ReturnType<typeof setTimeout> | null;
    unsubscribe: (() => void) | null;
}

export function createTooltipFactory(options: TooltipOptions = {}) {
    const {closeDelay = 1_000, additionalClassName} = options;
    let initialized = false;

    const state: TooltipState = {
        currentId: null,
        timer: null,
        unsubscribe: null,
    };

    const getActiveTooltip = () => {
        if (!state.currentId) {
            return null;
        }

        return document.getElementById(state.currentId);
    };

    const getActiveReference = () => {
        if (!state.currentId) {
            return null;
        }

        return getReferenceByTooltipId(state.currentId);
    };

    const hide = () => {
        const tooltip = getActiveTooltip();

        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        if (state.unsubscribe) {
            state.unsubscribe();
            state.unsubscribe = null;
        }

        if (tooltip) {
            tooltip.classList.remove(TOOLTIP_OPEN_CLASS);
            detachTooltip(tooltip);

            state.currentId = null;
        }
    };

    const show = (reference: HTMLElement, text: string) => {
        hide();

        const tooltip = createTooltipElement({text, className: additionalClassName});
        const update = updateTooltipPosition.bind(null, options, reference, tooltip);

        state.currentId = tooltip.id;

        attachTooltip(tooltip, reference);

        state.unsubscribe = subscribeToScroll(reference, update);

        tooltip.classList.add(TOOLTIP_OPEN_CLASS);

        update();

        if (closeDelay > 0) {
            state.timer = setTimeout(hide, closeDelay);
        }
    };

    const handleUpdate = () => {
        const activeTooltip = getActiveTooltip();
        const activeReference = getActiveReference();

        if (activeTooltip && !activeReference) {
            hide();
            return;
        }

        if (activeTooltip && activeReference) {
            updateTooltipPosition(options, activeReference, activeTooltip);
        }
    };

    const init = () => {
        if (!initialized) {
            initialized = true;

            window.addEventListener('scroll', handleUpdate);
            window.addEventListener('resize', handleUpdate);
        }
    };

    const cleanup = () => {
        if (initialized) {
            initialized = false;

            window.removeEventListener('scroll', handleUpdate);
            window.removeEventListener('resize', handleUpdate);
        }
    };

    return {
        get visible() {
            return Boolean(state.currentId);
        },
        getActiveReference,
        show,
        hide,
        init,
        cleanup,
    };
}

function createTooltipElement(options: TooltipElementOptions) {
    const {text, className} = options;

    const id = generateId();
    const tooltip = document.createElement('div');

    tooltip.id = id;
    tooltip.className = className ? `${TOOLTIP_BASE_CLASS} ${className}` : TOOLTIP_BASE_CLASS;

    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-live', 'polite');

    tooltip.textContent = text;

    return tooltip;
}

function attachTooltip(tooltip: HTMLElement, reference: HTMLElement) {
    const container = document.querySelector(PAGE_CONTAINER_SELECTOR) || document.body;
    const ariaLive = reference.getAttribute('aria-live');

    reference.setAttribute(TOOLTIP_DATA_ATTR, tooltip.id);

    if (ariaLive) {
        tooltip.setAttribute('aria-live', ariaLive);
    }

    container.appendChild(tooltip);
}

function detachTooltip(tooltip: HTMLElement) {
    if (tooltip.id) {
        const reference = getReferenceByTooltipId(tooltip.id);

        reference?.removeAttribute(TOOLTIP_DATA_ATTR);
    }

    tooltip.remove();
}

function getReferenceByTooltipId(id: string) {
    return document.querySelector<HTMLElement>(`[${TOOLTIP_DATA_ATTR}="${id}"]`);
}

function subscribeToScroll(reference: HTMLElement, update: () => void) {
    const scrollableElement = getParentScrollableElement(reference);

    scrollableElement.addEventListener('scroll', update);

    return () => {
        scrollableElement.removeEventListener('scroll', update);
    };
}

function getParentScrollableElement(target: HTMLElement) {
    const closestScrollableParent = target.closest('table') || target.closest('code');

    return closestScrollableParent || target.parentElement || document.body;
}

function createTooltipContext(
    referenceElement: HTMLElement,
    tooltipElement: HTMLElement,
): TooltipContext | null {
    const tooltipParent = tooltipElement.parentElement;

    if (!tooltipParent) {
        return null;
    }

    const elements: TooltipContextElements = {
        reference: referenceElement,
        tooltip: tooltipElement,
        offsetParent: tooltipParent,
    };

    const viewport = getViewportRect();
    const reference = getElementRect(referenceElement);
    const {width, height} = tooltipElement.getBoundingClientRect();

    return {
        isRtl: document.dir === 'rtl',
        viewport,
        reference,
        tooltip: createRect({top: 0, left: 0, width, height}),
        elements,
    };
}

function updateTooltipPosition(
    options: TooltipOptions,
    referenceElement: HTMLElement,
    tooltipElement: HTMLElement,
) {
    const context = createTooltipContext(referenceElement, tooltipElement);

    if (!context) {
        return;
    }

    const coords = getTooltipCoords(context, options);

    tooltipElement.style.top = `${coords.y}px`;
    tooltipElement.style.left = `${coords.x}px`;
}

function getTooltipCoords(context: TooltipContext, options: TooltipOptions): Coords {
    const {placement = 'bottom-start', offset = DEFAULT_OFFSET_VALUES, flip = true} = options;
    const {reference, tooltip, viewport, isRtl} = context;

    const {coords} = computePosition(reference, tooltip, viewport, placement, offset, isRtl, flip);

    const rect = updateRect(tooltip, {top: coords.y, left: coords.x});
    const relativeRect = convertToRelativeToOffsetParentRect(rect, context.elements.offsetParent);

    return {
        x: relativeRect.left,
        y: relativeRect.top,
    };
}

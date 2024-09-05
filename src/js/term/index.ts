import {getEventTarget, isCustom} from '../utils';

import {
    closeDefinition,
    openClass,
    openDefinition,
    openDefinitionClass,
    setDefinitionPosition,
} from './utils';

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        if (getEventTarget(event) || !isCustom(event)) {
            openDefinition(getEventTarget(event) as HTMLElement);
        }
    });

    document.addEventListener('keydown', (event) => {
        const openedDefinition = document.getElementsByClassName(
            openDefinitionClass,
        )[0] as HTMLElement;

        if (event.key === 'Enter' && document.activeElement) {
            openDefinition(document.activeElement as HTMLElement);
        }

        if (event.key === 'Escape' && openedDefinition) {
            closeDefinition(openedDefinition);
        }
    });

    window.addEventListener('resize', () => {
        const openedDefinition = document.getElementsByClassName(
            openDefinitionClass,
        )[0] as HTMLElement;

        if (!openedDefinition) {
            return;
        }

        const termId = openedDefinition.getAttribute('term-id') || '';
        const termElement = document.getElementById(termId);

        if (!termElement) {
            openedDefinition.classList.toggle(openClass);
            return;
        }

        setDefinitionPosition(openedDefinition, termElement);
    });
}

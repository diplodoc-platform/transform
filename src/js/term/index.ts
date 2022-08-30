import {
    Selector,
    openClass,
    openDefinitionClass,
    createDefinitionElement,
    setDefinitionId,
    setDefinitionPosition,
    closeDefinition,
} from './utils';
import {getEventTarget, isCustom} from '../utils';

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const openDefinition = document.getElementsByClassName(
            openDefinitionClass,
        )[0] as HTMLElement;
        const target = getEventTarget(event) as HTMLElement;

        const termId = target.getAttribute('id');
        const termKey = target.getAttribute('term-key');
        let definitionElement = document.getElementById(termKey + '_element');

        if (termKey && !definitionElement) {
            definitionElement = createDefinitionElement(target);
        }

        const isSameTerm = openDefinition && termId === openDefinition.getAttribute('term-id');
        if (isSameTerm) {
            closeDefinition(openDefinition);
            return;
        }

        const isTargetDefinitionContent = target.closest(
            [Selector.CONTENT.replace(' ', ''), openClass].join('.'),
        );

        if (openDefinition && !isTargetDefinitionContent) {
            closeDefinition(openDefinition);
        }

        if (isCustom(event) || !target.matches(Selector.TITLE) || !definitionElement) {
            return;
        }

        setDefinitionId(definitionElement, target);
        setDefinitionPosition(definitionElement, target);

        definitionElement.classList.toggle(openClass);
    });

    document.addEventListener('keydown', (event) => {
        const openDefinition = document.getElementsByClassName(
            openDefinitionClass,
        )[0] as HTMLElement;
        if (event.key === 'Escape' && openDefinition) {
            closeDefinition(openDefinition);
        }
    });

    window.addEventListener('resize', () => {
        const openDefinition = document.getElementsByClassName(
            openDefinitionClass,
        )[0] as HTMLElement;

        if (!openDefinition) {
            return;
        }

        const termId = openDefinition.getAttribute('term-id') || '';
        const termElement = document.getElementById(termId);

        if (!termElement) {
            openDefinition.classList.toggle(openClass);
            return;
        }

        setDefinitionPosition(openDefinition, termElement);
    });
}

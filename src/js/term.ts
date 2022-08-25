import {getEventTarget, isCustom} from './utils';

const Selector = {
    TITLE: '.yfm .yfm-term_title',
    CONTENT: '.yfm .yfm-term_dfn',
};

const ClassName = {
    OPEN: 'open',
};

function createDefinitionElement(element: HTMLElement) {
    const termKey = element.getAttribute('term-key');

    const definitionTemplate = document.getElementById(
        termKey + '_template',
    ) as HTMLTemplateElement;
    const definitionElement = definitionTemplate?.content.cloneNode(true).firstChild as HTMLElement;

    document.body.append(definitionElement);

    return definitionElement;
}

function setDefinitionId(definitionElement: HTMLElement, termElement: HTMLElement): void {
    if (!definitionElement.getAttribute('id')) {
        const termKey = termElement.getAttribute('term-key');
        definitionElement?.setAttribute('id', termKey + '_element');
    }

    const termId = termElement.getAttribute('id') || Math.random().toString(36).substr(2, 8);
    definitionElement?.setAttribute('term-id', termId);
}

function setDefinitionPosition(definitionElement: HTMLElement, termElement: HTMLElement): void {
    const {x: termX, y: termY} = termElement.getBoundingClientRect();

    const relativeX = Number(definitionElement.getAttribute('relativeX'));
    const relativeY = Number(definitionElement.getAttribute('relativeY'));

    if (relativeX === termX && relativeY === termY) {
        return;
    }

    definitionElement.setAttribute('relativeX', String(termX));
    definitionElement.setAttribute('relativeY', String(termY));

    const offsetTop = 25;

    definitionElement.style.top = Math.abs(termY) + window.scrollY + offsetTop + 'px';
    definitionElement.style.left = termX + window.scrollX + 'px';
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const openDefinition = document.getElementsByClassName(
            'yfm yfm-term_dfn open',
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
            openDefinition.classList.remove(ClassName.OPEN);
            return;
        }

        const isTargetDefinitionContent = target.closest(
            [Selector.CONTENT.replace(' ', ''), ClassName.OPEN].join('.'),
        );

        if (openDefinition && !isTargetDefinitionContent) {
            openDefinition.classList.remove(ClassName.OPEN);
        }

        if (isCustom(event) || !target.matches(Selector.TITLE) || !definitionElement) {
            return;
        }

        setDefinitionId(definitionElement, target);
        setDefinitionPosition(definitionElement, target);

        definitionElement.classList.toggle(ClassName.OPEN);
    });

    document.addEventListener('keydown', (event) => {
        const openDefinition = document.getElementsByClassName(
            'yfm yfm-term_dfn open',
        )[0] as HTMLElement;
        if (event.key === 'Escape' && openDefinition) {
            openDefinition.classList.remove(ClassName.OPEN);
        }
    });

    window.addEventListener('resize', () => {
        const openDefinition = document.getElementsByClassName(
            'yfm yfm-term_dfn open',
        )[0] as HTMLElement;

        if (!openDefinition) {
            return;
        }

        const termId = openDefinition.getAttribute('term-id') || '';
        const termElement = document.getElementById(termId);

        if (!termElement) {
            return;
        }

        setDefinitionPosition(openDefinition, termElement);
    });
}

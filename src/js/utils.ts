export const getEventTarget = (event: Event) => {
    const path = event.composedPath();
    return Array.isArray(path) && path.length > 0 ? path[0] : event.target;
};

export const isCustom = (event: Event) => {
    const target = getEventTarget(event);
    return !target || !(target as HTMLElement).matches;
};

export const copyToClipboard = (text: string) => {
    if (!text) {
        return Promise.resolve();
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.setAttribute('style', 'position: absolute; left: 1000%');
    textarea.textContent = text;
    document.body.append(textarea);

    textarea.select();
    document.execCommand('copy');

    document.body.removeChild(textarea);

    return Promise.resolve();
};

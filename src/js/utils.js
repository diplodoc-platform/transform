export const getEventTarget = (event) => {
    const path = event.composedPath();
    return Array.isArray(path) && path.length > 0 ? path[0] : event.target;
};

export const isCustom = (event) => {
    const target = getEventTarget(event);
    return !target || !target.matches;
};

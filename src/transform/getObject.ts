// eslint-disable-next-line @typescript-eslint/no-explicit-any
export = function getObject(path: string, obj: Record<string, any>, fallback?: any) {
    const queue = path.split('.');

    let box = obj;
    while (queue.length) {
        const step = queue.shift() as string;

        if (!Object.prototype.hasOwnProperty.call(box, step)) {
            return fallback || undefined;
        }

        box = box[step];
    }

    return box;
};

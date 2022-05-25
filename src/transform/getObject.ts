export = function getObject(path: string, obj: Object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return path.split('.').reduce((acc: any | undefined, item) => {
        if (!acc || !Object.getOwnPropertyNames(acc).includes(item)) {
            return undefined;
        }

        return acc[item];
    }, obj);
};

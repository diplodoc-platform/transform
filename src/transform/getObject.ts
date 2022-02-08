export default function getObject(path: string, obj: Object) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return path.split('.').reduce((acc: any | undefined, item) => {
        if (!acc || !(item in acc)) {
            return undefined;
        }

        return acc[item];
    }, obj);
}

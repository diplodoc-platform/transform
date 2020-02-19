

function getObject(path, obj) {
    return path.split('.').reduce((acc, item) => {
        if (!acc || !(item in acc)) {
            return undefined;
        }

        return acc[item];
    }, obj);
}

module.exports = getObject;

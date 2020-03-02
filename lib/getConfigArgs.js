const fs = require('fs');
const yaml = require('js-yaml');

module.exports = function getConfigVars(pathToFile) {
    try {
        let args = yaml.safeLoad(fs.readFileSync(pathToFile, 'utf8'))['yfm-transform'];
        if (Array.isArray(args)) {
            args = args.reduce((obj, el) => {
                Object.assign(obj, el);
                return obj;
            }, {});
        }
        return args;
    } catch (e) {
        return {};
    }
};

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const log = require('./log');

module.exports = function getConfigParams(pathToFile, source) {
    const pathToConfig = pathToFile === undefined ? path.resolve(source, '.yfm') : pathToFile;
    try {
        const args = yaml.safeLoad(fs.readFileSync(pathToConfig, 'utf8'));

        if (!Array.isArray(args) && typeof args === 'object' && args !== null) {
            return args;
        } else {
            const argsType = Array.isArray(args) ? 'array' : typeof args;
            // eslint-disable-next-line max-len
            log.warn(`Incorrect syntax in the configuration file. Got an ${argsType}, while an object is expected.`);
            return {};
        }
    } catch (e) {
        if (pathToFile !== undefined) {
            // Если путь передан и он некорректный
            throw new Error(e);
        }
        return {};
    }
};

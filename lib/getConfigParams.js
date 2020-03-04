const fs = require('fs');
const yaml = require('js-yaml');
const log = require('./log');

module.exports = function getConfigParams(pathToFile) {
    const linkToSyntax = 'https://testing.docs.yandex-team.ru/docs/docstools/#.yfm';
    try {
        const args = yaml.safeLoad(fs.readFileSync(pathToFile, 'utf8'))['yfm-transform'];

        if (!Array.isArray(args) && typeof args === 'object' && args !== null) {
            return args;
        } else {
            const argsType = Array.isArray(args) ? 'array' : typeof args;
            // eslint-disable-next-line max-len
            log.warn(`Incorrect syntax in the configuration file. Got an ${argsType}, while an object is expected.\nPlease check the correct syntax ${linkToSyntax}`);
            return {};
        }
    } catch (e) {
        if (pathToFile !== undefined) {
            log.warn(e.message);
        }
        return {};
    }
};

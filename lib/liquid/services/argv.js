let _argv;

function getConfig() {
    return _argv || {};
}

function init(argv) {
    _argv = {...argv};
}

module.exports = {
    getConfig,
    init,
};

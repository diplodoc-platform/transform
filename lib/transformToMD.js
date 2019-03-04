'use strict';

const liquid = require('./liquid');
const {buildVars} = require('./vars');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

module.exports = function transform(input, {vars = {}, varsPreset, path, root, skipErrors} = {}) {
    const match = R_LIQUID.exec(input);

    if (!match) {
        return input;
    }

    const builtVars = buildVars(vars, varsPreset, path, root);
    return liquid(input, builtVars, skipErrors);
};

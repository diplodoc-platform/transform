function length(input) {
    return input.length;
}

function capitalize(input) {
    return String(input).replace(/^([a-z])/, (m, chr) => chr.toUpperCase());
}

function escapeMarkdown(input) {
    return String(input).replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1');
}

module.exports = {
    length,
    capitalize,
    escapeMarkdown,
};

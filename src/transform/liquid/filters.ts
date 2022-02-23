export function length(input: string) {
    return input.length;
}

export function capitalize(input: string) {
    return String(input).replace(/^([a-z])/, (_m, chr) => chr.toUpperCase());
}

export function escapeMarkdown(input: string) {
    return String(input).replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1');
}

const index = {
    length,
    capitalize,
    escapeMarkdown,
};

export default index;

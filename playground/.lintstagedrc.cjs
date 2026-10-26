// Run the nested package's checks in its own directory; the root linters ignore playground.
module.exports = {
    '*': () => ['npm run lint', 'npm run typecheck', 'npm test'],
};

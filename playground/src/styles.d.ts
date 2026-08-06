// TypeScript 7 requires declarations for side-effect imports of non-code modules
// (TS2882). Such imports were silently accepted up to 5.9.3.
declare module '*.scss' {
    const content: string;
    export default content;
}

declare module '*.css' {
    const content: string;
    export default content;
}

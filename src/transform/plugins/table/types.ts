export type YfmTablePluginOptions = {
    /**
     * Sets whether to interpret the pipe symbol inside the code block as a table separator.
     *
     * Set to false if the fence rule is disabled in the parser.
     *
     * @default true
     */
    table_ignoreSplittersInBlockCode?: boolean;
    // TODO: set table_ignoreSplittersInInlineCode=true by default in next major version
    /**
     * Sets whether to interpret the pipe symbol inside the inline code as a table separator.
     *
     * Set to true if the code_inline rule is enabled in the parser.
     *
     * @default false
     */
    table_ignoreSplittersInInlineCode?: boolean;
    /**
     * Sets whether to interpret the pipe symbol inside the math block as a table separator.
     *
     * Set to true if the math_block rule is enabled in the parser.
     *
     * @default false
     */
    table_ignoreSplittersInBlockMath?: boolean;
    /**
     * Sets whether to interpret the pipe symbol inside the inline math as a table separator.
     *
     * Set to true if the math_inline rule is enabled in the parser.
     *
     * @default false
     */
    table_ignoreSplittersInInlineMath?: boolean;
};

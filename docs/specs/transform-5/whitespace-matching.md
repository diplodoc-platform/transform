# Whitespace matching compatibility

Include syntax and dangerous CSS URL matching must not repartition the same run
of whitespace around an absent optional marker or quote. Factoring the optional
token together with its following whitespace preserves the existing grammar.

Include expressions remain fresh, non-global instances with the historical three
capture groups. The CSS expression keeps its case-insensitive URL scheme policy,
including unmatched optional quotes. Short generated inputs compare both actual
expressions with frozen pre-change compatibility oracles; public Node and browser
sanitizers retain unsafe-style rejection and ordinary URL handling.

Long malformed whitespace inputs belong to the separate manual performance suite.
This change addresses overlapping-whitespace backtracking, not every possible
malformed include input or the complexity of the complete Markdown parser.

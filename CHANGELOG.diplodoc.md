# @diplodoc/transform@1.0 release

## It's major update of @doc-tools/transform@3.11.0 with security changes.

# Changelog
## New term's linter:
1. The main feature of term is generating a hidden content, that will be show on click. Terms plugins creates MarkadownIt tokens at place, where term was defined and it can brake our ```@doc-tools/docs``` navigation. Now ```@diplodoc/transform``` has new yfmlint rule: ```no-term-definition-in-content```. There are several restrictions:
    - You can't define content between term-def
    - All term-def should be placed at the end of file.
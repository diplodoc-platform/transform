import Token from "markdown-it/lib/token";

type Attrs = 'class' | 'id' | 'attr';

export class AttrsParser {
    DELIMITER = '=';
    SEPARATOR = ' ';
    QUOTATION = '"';
    /* allowed in keys / values chars */
    ALLOWED_CHARS = /[a-zA-Z0-9_\- {}.|/]/;
    /* allowed in all query chars */
    VALIDATION_CHARS = /[a-zA-Z0-9_\- {}.#="|/]/;

    state: Record<string, string[]> = {};

    constructor(value?: string){
        if (value) {
            this.parse(value);
        }  
    }


    #key = '';
    #pending = '';
    #isInsideQuotation = false;
    #didQuotationClosed = false;
    #currentKeyType: Attrs | undefined;

    #selectors: Record<Attrs, RegExp> = {
        id: /#/,
        class: /\./,
        attr: /[a-zA-Z-_]/,
    };

    #handlers = Object.entries(this.#selectors) as [Attrs, RegExp][];

    parse(target: string): Record<string, string[]> {
        /* escape from {} */
        const content = this.extract(target.trim());

        if (!content) {
            return {};
        }

        this.clear();
        this.state = {};

        for (const char of content) {
            this.next(char);
        }

        /* end-of-content mark */
        this.next(this.SEPARATOR);

        this.clear();

        return this.state;
    }

    apply(target: Token) {
        const {attr: singleKeyAttrs = [], ...fullAttrs} = this.state;
        for (const [property, values] of Object.entries(fullAttrs)) {
            target.attrJoin(property, values.join(' '));
        }

        for (const attr of singleKeyAttrs) {
            target.attrJoin(attr, 'true');
        }
    }

    private extract(target: string): string | false {
        if (!target.startsWith('{')) {
            return false;
        }

        let balance = 1;

        for (let i = 1; i < target.length; i++) {
            const char = target[i];

            if (char === '}') {
                balance--;
            }

            if (char === '{') {
                balance++;
            }

            if (balance === 0) {
                const contentInside = target.slice(1, i).trim();

                return contentInside;
            }

            if (balance < 0) {
                return false;
            }

            if (!this.VALIDATION_CHARS.test(char)) {
                return false;
            }
        }

        return false;
    }

    private next(value: string) {
        if (!this.#currentKeyType) {
            this.#currentKeyType = this.type(value);

            if (this.#currentKeyType === 'attr') {
                this.#pending = value;
            }

            return;
        }

        if (this.isSeparator(value)) {
            if (!this.#pending) {
                /* (name= ) construction */
                if (!this.#isInsideQuotation) {
                    this.append(this.#key, ' ');
                    this.clear();

                    return;
                }
            }

            /* single key (.name #id contenteditable) */
            if (!this.#key && this.#pending) {
                this.append();
                this.clear();

                return;
            }

            /* trying to find close quotation */
            if (this.#isInsideQuotation && !this.#didQuotationClosed) {
                this.#pending += value;
                return;
            }

            if (this.#isInsideQuotation && this.#didQuotationClosed) {
                this.append(this.#key, this.#pending);
            }

            if (!this.#isInsideQuotation && !this.#didQuotationClosed) {
                this.append(this.#key, this.#pending);
            }

            this.clear();

            return;
        }

        if (this.isAllowedChar(value)) {
            this.#pending += value;

            return;
        }

        if (this.isQuotation(value)) {
            if (this.#isInsideQuotation) {
                this.#didQuotationClosed = true;
            } else {
                this.#isInsideQuotation = true;
            }
        }

        if (this.isDelimiter(value)) {
            /* symbol is not delimiter, adding it to value */
            if (this.#key) {
                this.#pending += value;

                return;
            }

            this.#key = this.#pending;
            this.#pending = '';
        }
    }

    private type(of: string): Attrs | undefined {
        return this.#handlers.find(([_, regex]) => regex.test(of))?.[0];
    }

    private append(key: string | undefined = this.#currentKeyType, value: string = this.#pending) {
        if (!key) {
            return;
        }

        if (!this.state[key]) {
            this.state[key] = [];
        }

        this.state[key].push(value);
    }

    private clear() {
        this.#key = '';
        this.#pending = '';

        this.#isInsideQuotation = false;
        this.#didQuotationClosed = false;

        this.#currentKeyType = undefined;
    }

    private isDelimiter(target: string) {
        return target === this.DELIMITER;
    }

    private isSeparator(target: string) {
        return target === this.SEPARATOR;
    }

    private isQuotation(target: string) {
        return target === this.QUOTATION;
    }

    private isAllowedChar(target: string) {
        return this.ALLOWED_CHARS.test(target);
    }
}


(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});

    function kitLexer(input) {
        const length = input.length;
        const tokens = [];
        let i = 0;

        const isDigit = (ch) => ch >= '0' && ch <= '9';
        const isAlpha = (ch) => /[a-zA-Z_$]/.test(ch);
        const isAlphaNum = (ch) => /[a-zA-Z0-9_$]/.test(ch);
        const isWhitespace = (ch) => /\s/.test(ch);

        const punctuators = new Set([
            '===', '!==', '==', '!=', '<=', '>=', '<<', '>>', '>>>',
            '**', '&&', '||',
            '+', '-', '*', '/', '%', '**',
            '<', '>', '=', '!', '&', '|', '^', '~',
            '?', ':', '.', ',', ';',
            '(', ')', '{', '}', '[', ']',
            '++', '--'
        ]);

        function peek(offset = 0) {
            return input[i + offset];
        }

        function consume() {
            return input[i++];
        }

        function readNumber() {
            let num = '';
            let start = i;
            while (isDigit(peek())) num += consume();

            if (peek() === '.') {
                num += consume();
                while (isDigit(peek())) num += consume();
            }
            let end = i - 1;
            return { type: 'number', value: parseFloat(num), start, end };
        }

        function readIdentifier() {
            let id = '';
            let start = i;
            while (peek() != null && isAlphaNum(peek())) id += consume();
            let end = i - 1;
            return { type: 'identifier', value: id, start, end };
        }

        function readString() {
            const quote = consume(); // ", ', `
            let str = '';
            let start = i - 1;
            while (i < length && peek() !== quote) {
                const ch = consume();
                str += (ch === '\\') ? consume() : ch;
            }
            consume(); // closing quote
            let end = i - 1;
            return { type: 'string', value: str, quote, start, end };
        }

        function readOperatorOrPunctuator() {
            for (let len = 3; len >= 1; len--) {
                if (i + len > input.length) continue;
                const candidate = input.slice(i, i + len);
                if (punctuators.has(candidate)) {
                    let start = i;
                    i += len;
                    let end = i - 1;

                    // Phân loại theo nhóm
                    if (['(', ')'].includes(candidate)) return { type: 'paren', value: candidate, start, end };
                    if (['{', '}'].includes(candidate)) return { type: 'brace', value: candidate, start, end };
                    if (['[', ']'].includes(candidate)) return { type: 'bracket', value: candidate, start, end };
                    if ([':', '.', ',', '?'].includes(candidate)) return { type: 'punctuator', value: candidate, start, end };
                    if (candidate === ';') return { type: 'semicolon', value: ';', start, end };

                    return { type: 'operator', value: candidate, start, end };
                }
            }

            let start = i;
            let val = consume();
            let end = i - 1;
            return { type: 'unknown', value: val, start, end };
        }

        while (i < length) {
            const ch = peek();

            if (isWhitespace(ch)) {
                i++; // skip whitespace, not tokenized
                continue;
            }

            if (isDigit(ch)) {
                tokens.push(readNumber());
                continue;
            }
            if (isAlpha(ch)) {
                tokens.push(readIdentifier());
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                tokens.push(readString());
                continue;
            }
            tokens.push(readOperatorOrPunctuator());
        }

        return tokens;
    }


    kitmodule.lexer = kitLexer

})(typeof window !== "undefined" ? window : globalThis);

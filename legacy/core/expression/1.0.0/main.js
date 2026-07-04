(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { lexer: kitLexer } = kitmodule
    function kitExpression(code) {
        if (code.startsWith("{") && code.endsWith("}")) {
            code = code.slice(1, -1).trim();
        }

        // Chuẩn hóa dấu phân cách
        code = code.replace(/,/g, ";");

        const tokens = kitLexer(code);
        const result = {};
        let i = 0;

        function next() {
            return tokens[i++];
        }

        function peek(offset = 0) {
            return tokens[i + offset];
        }

        function parseKey() {
            const token = next();
            if (!token) return null;

            let key = "";

            // Trường hợp key là chuỗi
            if (token.type === "string") {
                return token.quote + token.value + token.quote;
            }

            // Trường hợp key là số
            if (token.type === "number") {
                return token.value;
            }

            // Trường hợp key là identifier (hỗ trợ - và _)
            if (token.type === "identifier") {
                key += token.value;

                // Cho phép thêm các ký tự `-` và `_` như một phần của key
                while (
                    peek() &&
                    ['-', '_'].includes(peek().value) &&
                    peek(1) && peek(1).type === 'identifier'
                ) {
                    key += next().value; // dấu - hoặc _
                    key += next().value; // identifier tiếp theo
                }

                // Gọi hàm như func(300) hoặc func-name(300)
                if (peek() && peek().value === "(") {
                    let depth = 0;
                    while (peek()) {
                        const t = peek();
                        key += t.value;
                        if (t.value === "(") depth++;
                        else if (t.value === ")") depth--;
                        next();
                        if (depth === 0) break;
                    }
                }

                return key;
            }

            return null;
        }

        function parseValue() {
            if (i >= tokens.length) return '';

            const startToken = tokens[i];
            let startIndex = startToken.start;

            let depth = 0;
            while (i < tokens.length) {
                const t = peek();

                if (t.value === ';' && depth === 0) {
                    break;
                }

                if (["(", "[", "{"].includes(t.value)) {
                    depth++;
                } else if ([")", "]", "}"].includes(t.value)) {
                    depth--;
                }

                next();
            }
            const endToken = tokens[i - 1];
            let endIndex = endToken.end;

            // Cắt nguyên đoạn trong code gốc, giữ nguyên dấu cách, định dạng
            return code.slice(startIndex, endIndex + 1);
        }

        while (i < tokens.length) {
            const key = parseKey();
            if (!key) break;

            const colon = next();
            if (!colon || colon.value !== ":") break;

            const value = parseValue();

            const separator = peek();
            if (separator && separator.value === ";") next();

            result[key] = value;
        }

        return result;
    }


    kitmodule.expression = kitExpression
})(typeof window !== 'undefined' ? window : globalThis);

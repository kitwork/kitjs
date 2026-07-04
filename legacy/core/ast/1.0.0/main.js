(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});
    function kitAST(tokens) {
        let i = 0;

        const PRECEDENCE = {
            '||': 1,
            '&&': 2,
            '==': 3, '!=': 3, '===': 3, '!==': 3,
            '<': 4, '>': 4, '<=': 4, '>=': 4,
            '+': 5, '-': 5,
            '*': 6, '/': 6, '%': 6,
        };

        function peek(offset = 0) {
            return tokens[i + offset];
        }

        function consume() {
            return tokens[i++];
        }

        function match(type, value) {
            const token = peek();
            return token && token.type === type && (!value || token.value === value);
        }

        function expect(type, value) {
            const token = consume();
            if (!token || token.type !== type || (value && token.value !== value)) {
                throw new Error(`Expected ${type} '${value}', got ${token?.type} '${token?.value}'`);
            }
            return token;
        }

        // Hàm parse member expression (dùng sau khi có một expr identifier)
        function parseMemberExpression(expr) {
            while (true) {
                if (match('punctuator', '.')) {
                    consume();
                    const property = parsePrimary();
                    expr = {
                        type: 'MemberExpression',
                        object: expr,
                        property,
                        computed: false
                    };
                } else if (match('bracket', '[')) {
                    consume();
                    const property = parseExpression();
                    expect('bracket', ']');
                    expr = {
                        type: 'MemberExpression',
                        object: expr,
                        property,
                        computed: true
                    };
                } else {
                    break;
                }
            }
            return expr;
        }

        // Hàm parse callee sau new: chỉ nhận Identifier hoặc MemberExpression bắt đầu từ Identifier
        function parseCallee() {
            const token = peek();
            if (token.type === 'identifier') {
                const idToken = consume();
                let expr = { type: 'Identifier', name: idToken.value };
                expr = parseMemberExpression(expr);
                return expr;
            } else if (match('paren', '(')) {
                consume();
                const expr = parseExpression();
                expect('paren', ')');
                return expr;
            } else {
                throw new Error("Expected constructor (identifier or member) after 'new'");
            }
        }

        function parsePrimary() {
            const token = peek();

            if (!token) throw new Error("Unexpected end of input");

            // Xử lý cú pháp new Constructor(...)
            if (token.type === 'identifier' && token.value === 'new') {
                consume(); // bỏ token 'new'
                const callee = parseCallee(); // parse constructor
                expect('paren', '(');
                const args = [];
                if (!match('paren', ')')) {
                    do {
                        args.push(parseExpression());
                    } while (match('punctuator', ',') && consume());
                }
                expect('paren', ')');
                return {
                    type: 'NewExpression',
                    callee,
                    arguments: args
                };
            }

            if (match('paren', '(')) {
                consume();
                const expr = parseExpression();
                expect('paren', ')');
                return expr;
            }

            if (match('brace', '{')) {
                return parseObjectExpression();
            }

            if (match('bracket', '[')) {
                return parseArrayExpression();
            }

            if (token.type === 'number') {
                consume();
                return { type: 'Literal', value: token.value };
            }

            if (token.type === 'string') {
                consume();
                return { type: 'Literal', value: token.value };
            }

            if (match('operator', '++') || match('operator', '--')) {
                const op = consume().value;
                const argument = parsePrimary();
                return {
                    type: 'UpdateExpression',
                    operator: op,
                    argument,
                    prefix: true
                };
            }

            // if (token.type === 'identifier') {
            //     consume();
            //     return { type: 'Identifier', name: token.value };
            // }

            if (token.type === 'identifier') {
                consume();
                let node = { type: 'Identifier', name: token.value };
                // Postfix
                if (match('operator', '++') || match('operator', '--')) {
                    const op = consume().value;
                    return {
                        type: 'UpdateExpression',
                        operator: op,
                        argument: node,
                        prefix: false
                    };
                }
                return node;
            }

            if (token.type === 'operator' && ['!', '+', '-', '~'].includes(token.value)) {
                const op = token.value;
                consume();
                const argument = parsePrimary();
                return {
                    type: 'UnaryExpression',
                    operator: op,
                    argument,
                    prefix: true
                };
            }

            throw new Error(`Unexpected token: ${token.type} ${token.value}`);
        }

        function parseMemberAndCall(expr) {
            while (true) {
                if (match('punctuator', '.')) {
                    consume();
                    const property = parsePrimary();
                    expr = {
                        type: 'MemberExpression',
                        object: expr,
                        property,
                        computed: false
                    };
                } else if (match('bracket', '[')) {
                    consume();
                    const property = parseExpression();
                    expect('bracket', ']');
                    expr = {
                        type: 'MemberExpression',
                        object: expr,
                        property,
                        computed: true
                    };
                } else if (match('paren', '(')) {
                    consume();
                    const args = [];
                    if (!match('paren', ')')) {
                        do {
                            args.push(parseExpression());
                        } while (match('punctuator', ',') && consume());
                    }
                    expect('paren', ')');
                    expr = {
                        type: 'CallExpression',
                        callee: expr,
                        arguments: args
                    };
                } else {
                    break;
                }
            }
            return expr;
        }

        function parseBinaryExpression(minPrecedence = 0) {
            let left = parseMemberAndCall(parsePrimary());

            while (true) {
                const token = peek();
                if (!token || token.type !== 'operator') break;

                const precedence = PRECEDENCE[token.value];
                if (precedence === undefined || precedence < minPrecedence) break;

                const op = token.value;
                consume();
                const right = parseBinaryExpression(precedence + 1);

                left = {
                    type: 'BinaryExpression',
                    operator: op,
                    left,
                    right
                };
            }

            return left;
        }

        function parseTernary() {
            let test = parseBinaryExpression();

            if (match('punctuator', '?')) {
                consume();
                const consequent = parseExpression();
                expect('punctuator', ':');
                const alternate = parseExpression();

                return {
                    type: 'ConditionalExpression',
                    test,
                    consequent,
                    alternate
                };
            }

            return test;
        }

        function parseAssignment() {
            const left = parseTernary();

            if (match('operator', '=')) {
                const op = consume().value;
                const right = parseAssignment();
                return {
                    type: 'AssignmentExpression',
                    operator: op,
                    left,
                    right
                };
            }

            return left;
        }

        function parseArrayExpression() {
            expect('bracket', '[');
            const elements = [];
            while (!match('bracket', ']')) {
                elements.push(parseExpression());
                if (!match('bracket', ']')) expect('punctuator', ',');
            }
            expect('bracket', ']');
            return { type: 'ArrayExpression', elements };
        }

        function parseObjectExpression() {
            expect('brace', '{');
            const properties = [];
            while (!match('brace', '}')) {
                const keyToken = expect('identifier');
                const key = { type: 'Identifier', name: keyToken.value };
                expect('punctuator', ':');
                const value = parseExpression();
                properties.push({ type: 'Property', key, value });
                if (!match('brace', '}')) expect('punctuator', ',');
            }
            expect('brace', '}');
            return { type: 'ObjectExpression', properties };
        }

        function parseExpression() {
            return parseAssignment();
        }

        function parseProgram() {
            const body = [];
            while (i < tokens.length) {
                const expr = parseExpression();
                body.push(expr);
                if (match('semicolon', ';')) consume();
                else break;
            }
            return { type: 'Program', body };
        }

        return parseProgram();
    }

    kitmodule.ast = kitAST

})(typeof window !== "undefined" ? window : globalThis);

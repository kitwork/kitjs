(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { lexer: kitLexer, ast: kitAST, evaluate: kitEvaluate } = kitmodule
    // Compile expression to getter/assign function with AST cache
    function kitCompile(expr) {
        // 1. Tokenize
        const tokens = kitLexer(expr);
        // 2. Parse
        const ast = kitAST(tokens);

        // Getter: chỉ cần context (state), globals (context bổ sung), thisArg
        function getter(state = {}, context = {}) {
            // context: state, globals: context bổ sung, thisArg: this
            return kitEvaluate(ast, state, context);
        }

        // Nếu là assignment
        if (ast.type === "AssignmentExpression") {
            getter.assign = (state, value, context = {}) => {
                // Gán tạm giá trị mới cho right
                const right = ast.right;
                const originalRight = right;
                ast.right = { type: "Literal", value };
                const result = kitEvaluate(ast, state, context);
                ast.right = originalRight;
                return result;
            };
        }

        return getter;
    }
    kitmodule.compile = kitCompile
})(typeof window !== 'undefined' ? window : globalThis);

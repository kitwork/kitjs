(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { sanitizeHTML: kitSanitizer } = kitmodule
    function kitDirective(component) {



        return {
            if(el, expr, extra = {}) {
                if (extra && extra.update) return
                const parent = el.parentNode;
                const placeholder = document.createComment("kit:if");
                el.removeAttribute(component.$directive("if"));
                // giữ lại bản gốc để clone
                const template = el.cloneNode(true);
                parent.insertBefore(placeholder, el);
                el.remove();

                // node hiện tại hiển thị
                let currentNode = null;
                // console.log(el);

                component.$addEffect(placeholder, () => {

                    const shouldShow = !!component.$evaluator(expr, placeholder, null, extra);

                    if (shouldShow && !currentNode) {
                        // clone mới từ template
                        const node = template.cloneNode(true);
                        parent.insertBefore(node, placeholder.nextSibling);
                        currentNode = node;

                        component.$binding(node, "if", extra)

                    } else if (!shouldShow && currentNode) {

                        component.$cleanup(currentNode)
                        currentNode.remove();
                        currentNode = null;
                    }
                });
            },


            for(el, expr, extra = {}) {
                const exprs = component._parseExpr(expr).trim();
                if (!exprs) return;

                el.removeAttribute(component.$directive("for"));

                const template = el.cloneNode(true);
                const parent = el.parentNode;



                const placeholder = document.createComment("kit:for");

                parent.insertBefore(placeholder, el);

                el.remove();


                var implicit;
                var list = [];

                switch (typeof exprs) {
                    case "string":

                        if (!/\s/g.test(exprs)) {
                            list = component.$evaluator(exprs, el, null, extra);
                        } else {
                            implicit = parseForExpression(exprs)
                            if (implicit.$items) {
                                list = component.$evaluator(implicit.$items, el, null, extra);;
                            } else {
                                console.err("Invalid for expression: missing items", el, expr);
                            }

                        }
                        break;
                    case "object":
                        list = component.$evaluator(exprs.items, el, null, extra);;

                        break;
                }



                const nodeMap = new Map();




                component.$addEffect(placeholder, () => {
                    const newKeys = new Set();

                    console.log(list)
                    list.forEach((item, index) => {

                        var key;

                        if (typeof item === "object") {

                            item.$items = list
                            item.$index = index
                            item.$count = list.length
                            item.$first = index === 0
                            item.$even = index % 2 === 0
                            item.$odd = index % 2 === 1

                            key = item.$key = item[implicit.$key] ?? item.id ?? item.node ?? null
                        } else {
                            key = item
                        }





                        if (!key) console.log("$key chưa được định nghĩa")

                        let node = nodeMap.get(key);
                        newKeys.add(key)




                        if (!node) {
                            node = template.content
                                ? template.content.cloneNode(true)
                                : template.cloneNode(true);






                            nodeMap.set(key, node);

                            const nextItem = list[index + 1];
                            const nextNode = nextItem ? nodeMap.get(nextItem.$key) : placeholder;

                            // Nếu tìm được node của item kế tiếp thì chèn trước nó,
                            // nếu không thì mặc định chèn trước end marker.
                            parent.insertBefore(node, nextNode || placeholder);
                            var extra = { $item: item, $implicit: implicit};
                            if (typeof item !== "object") {
                                extra.$index = index
                            }
                            component.$binding(node, "for", extra);

                        }



                    });




                    // cleanup node không còn trong list
                    Array.from(nodeMap.keys()).forEach((key) => {


                        if (!newKeys.has(key)) {

                            const node = nodeMap.get(key);
                            component.$cleanup(node)
                            parent.removeChild(node);
                            nodeMap.delete(key);
                        }

                    });


                });
            },



            show(el, expr, extra = {}) {
                // console.log(extra)
                component.$addEffect(el, () => {

                    el.hidden = !component.$evaluator(expr, el, null, extra);
                })

            },
            class(el, expression, extra = {}) {
                component.$addEffect(el, () => {
                    const exprs = component._parseExpr(expression);
                    if (!exprs) return;

                    if (typeof exprs === 'string') {
                        const add = component.$evaluator(exprs, el, null, extra);
                        if (add) el.classList.add(add);

                        const remove = component.$evaluator(reverseTernary(exprs), el, null, extra);
                        if (remove) el.classList.remove(remove);
                        return;
                    }

                    if (typeof exprs === 'object') {
                        for (const [cls, cond] of Object.entries(exprs)) {
                            el.classList.toggle(cls, !!component.$evaluator(cond, el, null, extra));
                        }
                    }
                });
            },
            style(el, expression, extra = {}) {
                component.$addEffect(el, () => {
                    const exprs = component._parseExpr(expression);
                    if (!exprs || typeof exprs !== 'object') return;

                    for (const [prop, val] of Object.entries(exprs)) {
                        el.style[prop] = component.$evaluator(val, el, null, extra);
                    }
                });
            },
            bind(el, expression, extra = {}) {

                component.$addEffect(el, () => {
                    const exprs = component._parseExpr(expression);
                    if (!exprs) return;

                    if (typeof exprs === 'string') {
                        const value = component.$evaluator(exprs, el, null, extra);
                        const tag = el.tagName.toLowerCase();
                        switch (tag) {
                            case 'input':
                            case 'textarea':
                            case 'select':
                                if (["checkbox", "radio"].includes(el.type)) {
                                    el.checked = Boolean(value);
                                } else {
                                    el.value = value;
                                }
                                break;
                            case 'img':
                                el.src = value;
                                break;
                            case 'a':
                                el.href = value;
                                break;
                            default:
                                el.textContent = value;
                        }
                        return;
                    }

                    if (typeof exprs === 'object') {
                        for (const [prop, val] of Object.entries(exprs)) {
                            const result = component.$evaluator(val, el, null, extra);
                            switch (prop) {
                                case "text":
                                    el.textContent = result ?? "";
                                    break;
                                case "html":
                                    if (result) {
                                        el.innerHTML = kitSanitizer(result);
                                    } else {
                                        el.innerHTML = "";
                                    }
                                    break;
                                default:
                                    if (result) {
                                        el.setAttribute(prop, result);
                                    } else {
                                        el.removeAttribute(prop);
                                    }
                                    break;
                            }
                        }
                    }

                });
            },

            model(el, expr, extra = {}) {

                const exprs = component._parseExpr(expr);
                if (!exprs) return;

                if (typeof exprs === 'string') {
                    const tag = el.tagName.toLowerCase();
                    switch (tag) {
                        case 'input':
                        case 'textarea':
                        case 'select':
                            el.value = component.$evaluator(exprs, el, null, extra);


                            el.addEventListener('input', () => {
                                if (["checkbox", "radio"].includes(el.type)) {
                                    // el.checked = Boolean(value);

                                    if (Object.keys(extra).length > 0) {
                                        deepSet(extra, exprs, el.checked)
                                    } else {
                                        component.$scope[exprs] = el.checked
                                    }
                                } else {
                                    if (Object.keys(extra).length > 0) {
                                        deepSet(extra, exprs, el.value)
                                    } else {
                                        component.$scope[exprs] = el.value
                                    }
                                }


                            });
                            break;


                            break;
                    }
                }



                component.$addEffect(el, () => {
                    if (typeof exprs === 'string') {
                        const val = component.$evaluator(exprs, el, null, extra);
                        if (el.value !== val) el.value = val;
                    }

                });
            }
        };
    }

    function deepSet(obj, path, value) {
        const keys = path.split(".");
        const lastKey = keys.pop();

        // Đi sâu đến object cha
        const target = keys.reduce((acc, key) => {
            if (acc[key] === undefined) {
                acc[key] = {}; // nếu chưa có thì tạo mới
            }
            return acc[key];
        }, obj);

        // Gán giá trị cuối cùng
        return target[lastKey] = value;
    }



    // Helper
    function reverseTernary(expr) {
        const match = expr.match(/^(.*?)\?(.*?):(.*)$/);
        if (!match) return null;

        let [, condition, truthy, falsy] = match;
        return `!(${condition.trim()}) ? ${truthy.trim()} : ${falsy.trim()}`;
    }

    function parseForExpression(expr) {
        const result = {};

        // tách loop và alias
        const [loopPart, ...aliasParts] = expr.split(";").map(s => s.trim());

        let item, index, collection;

        // (item, i) of items
        let m = loopPart.match(/^(?:let\s+)?\(([^)]+)\)\s+(?:in|of)\s+(.+)$/);
        if (m) {
            const vars = m[1].split(",").map(s => s.trim());
            item = vars[0];
            index = vars[1];
            collection = m[2];
        }

        // let item of items
        if (!m) {
            m = loopPart.match(/^(?:let\s+)?(\w+)(?:\s*,\s*(\w+))?\s+(?:in|of)\s+(.+)$/);
            if (m) {
                item = m[1];
                index = m[2];
                collection = m[3];
            }
        }

        // item of items
        if (!m) {
            m = loopPart.match(/^(\w+)\s+(?:in|of)\s+(.+)$/);
            if (m) {
                item = m[1];
                collection = m[2];
            }
        }

        if (item) result["$item"] = item;
        if (index) result["$index"] = index;
        if (collection) result["$items"] = collection.trim();

        // alias
        aliasParts.forEach(part => {
            let m;

            // let name = $meta
            m = part.match(/^let\s+(\w+)\s*=\s*(\$\w+)$/);
            if (m) {
                const [, alias, meta] = m;
                result[meta] = alias;
                return;
            }

            // name as $meta
            m = part.match(/^(\w+)\s+as\s+(\$\w+)$/);
            if (m) {
                const [, alias, meta] = m;
                result[meta] = alias;
            }
        });


        return result;
    }

    // nếu invert = true thì đảo key/value
    function invertObject(obj) {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[v] = k;
        }
        return result;
    }


    kitmodule.directive = kitDirective

})(typeof window !== 'undefined' ? window : globalThis);

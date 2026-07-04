(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});
    function kitDirective(component) {



        return {
            if(el, expr, extra = {}) {
                const parent = el.parentNode;
                const directive = component.$directive("if1");
                const placeholder = document.createComment(directive);

                // giữ lại bản gốc để clone
                const template = el.cloneNode(true);
                parent.insertBefore(placeholder, el);
                el.remove();

                // node hiện tại hiển thị
                let currentNode = null;

                component.addEffect(placeholder, () => {
                    const shouldShow = !!component._evaluator(expr, null, null, extra);

                    if (shouldShow && !currentNode) {
                        // clone mới từ template
                        const node = template.cloneNode(true);
                        parent.insertBefore(node, placeholder.nextSibling);
                        currentNode = node;

                        component.bindDirectives(node, "if")

                    } else if (!shouldShow && currentNode) {

                        component.cleanupDirectives(currentNode)
                        currentNode.remove();
                        currentNode = null;
                    }
                });
            },


            for(el, expr, extra = {}) {
                const parent = el.parentNode;
                const directive = component.$directive("for");
                const placeholder = document.createComment(directive);
                parent.insertBefore(placeholder, el);
                el.remove();

                const template = el.cloneNode(true);

                // Track nodes theo index
                let renderedNodes = [];

                let list = component._evaluator(expr, null, null, extra);
                if (!Array.isArray(list)) list = [];

                const count = list.length;

                component.addEffect(el, () => {


                    // so sánh số lượng item
                    for (let i = 0; i < count; i++) {
                        const item = list[i];
                        let node = renderedNodes[i];

                        if (!node) {
                            // chưa có node -> clone
                            node = template.content
                                ? template.content.cloneNode(true)
                                : template.cloneNode(true);

                            if (node.tagName != "TEMPLATE") {
                                node.removeAttribute(component.$directive("for"));
                            }

                            parent.insertBefore(node, placeholder);

                            renderedNodes[i] = node;
                        }

                        // scope cho item này
                        const scope = {
                            item,
                            index: i,
                            count,
                            first: i === 0,
                            last: i === count - 1,
                            even: i % 2 === 0,
                            odd: i % 2 === 1
                        };

                        component.bindDirectives(node, "for", scope);
                    }

                    // xoá node thừa nếu list ngắn hơn trước
                    while (renderedNodes.length > count) {
                        const node = renderedNodes.pop();
                        component.cleanupDirectives(node);
                        node.remove();
                    }
                });
            },


            show(el, expr, extra = {}) {
                console.log(extra)
                component.addEffect(el, () => {
                    el.hidden = !component._evaluator(expr, null, null, extra);
                })

            },
            class(el, expression, extra = {}) {
                component.addEffect(el, () => {
                    const exprs = component._parseExpr(expression);
                    if (!exprs) return;

                    if (typeof exprs === 'string') {
                        const add = component._evaluator(exprs, null, null, extra);
                        if (add) el.classList.add(add);

                        const remove = component._evaluator(reverseTernary(exprs), null, null, extra);
                        if (remove) el.classList.remove(remove);
                        return;
                    }

                    if (typeof exprs === 'object') {
                        for (const [cls, cond] of Object.entries(exprs)) {
                            el.classList.toggle(cls, !!component._evaluator(cond, null, null, extra));
                        }
                    }
                });
            },
            style(el, expression, extra = {}) {
                component.addEffect(el, () => {
                    const exprs = component._parseExpr(expression);
                    if (!exprs || typeof exprs !== 'object') return;

                    for (const [prop, val] of Object.entries(exprs)) {
                        el.style[prop] = component._evaluator(val, null, null, extra);
                    }
                });
            },
            bind(el, expression, extra = {}) {

                component.addEffect(el, () => {
                    const exprs = component._parseExpr(expression);
                    if (!exprs) return;

                    if (typeof exprs === 'string') {
                        const value = component._evaluator(exprs, null, null, extra);
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
                            const result = component._evaluator(val, null, null, extra);
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

                            el.value = component._evaluator(exprs, null, null, extra);;
                            el.addEventListener('input', () => {
                                if (Object.keys(extra).length > 0) {
                                    extra.item.hello = component._evaluator(el.value, null, null, extra)
                                } else {
                                    component.$state[exprs] = component._evaluator(el.value, null, null, extra)
                                }

                            });
                            break;
                    }
                }



                component.addEffect(el, () => {
                    if (typeof exprs === 'string') {

                        if (el.value !== val) el.value = component._evaluator(el.value, null, null, extra);
                    }

                });
            }
        };
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

        // item of items (ngắn gọn)
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

        // alias dạng let name = $meta hoặc name as $meta
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



    // Helper
    function reverseTernary(expr) {
        const match = expr.match(/^(.*?)\?(.*?):(.*)$/);
        if (!match) return null;

        let [, condition, truthy, falsy] = match;
        return `!(${condition.trim()}) ? ${truthy.trim()} : ${falsy.trim()}`;
    }
    kitmodule.directive = kitDirective

})(typeof window !== 'undefined' ? window : globalThis);

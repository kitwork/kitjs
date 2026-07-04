(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { reactive: kitReactive, directive: kitDirective, expression: kitExpression, compile: kitCompile } = kitmodule

    function KitComponent(element, options, context) {


        const { prefix, attribute, symbol, kit } = context
        this.$symbol = symbol
        this[symbol] = context
        this.$attribute = attribute
        this.$name = element.getAttribute(attribute)
        this.$kit = kit
        this.$prefix = prefix


        this.$element = element
        this.$attach(element)
        this.$compiles = new Map()
        this.$binded = new Map()
        this._events = []
        var { state, methods, derived } = normalizeOptions(options);

        this.$dataset = extractDataset(element, kit, prefix)



        const parent = this.$element.parentElement?.closest("[data-kit-component]");
     
        this.$parent = parent ? parent.$component : null;
        if (this.$parent) {
            state.$parent = this.$parent
            console.log(this)
        }




        if (this.$dataset.hasOwnProperty("state")) {

            var stateData = this._parseExpr(this.$dataset.state)
            if (stateData && typeof stateData === "object") {
                for (const key in stateData) {
                    stateData[key] = this.$evaluator(stateData[key]) // ép sang số rồi cộng 1
                }
                state = { ...state, ...stateData }
            }
        }


        for (const key in this.$dataset) {
            const stateString = "state";
            if (key !== stateString && key.startsWith(stateString)) {
                const rawKey = key.slice(stateString.length); // cắt bỏ "state"
                const prop = rawKey.charAt(0).toLowerCase() + rawKey.slice(1); // viết thường chữ cái đầu
                let value = this.$evaluator(this.$dataset[key]);
                state[prop] = value;
            }
        }




        this.$methods = {}
        for (const key in methods) {
            if (typeof methods[key] === 'function') {
                this.$methods[key] = methods[key].bind(this); // bind TRỰC TIẾP
                this[key] = this.$methods[key]; // gán cả vào instance
            }
        }


        const { reactive, effect, stop } = kitReactive();
        this.$reactive = reactive
        this.$state = reactive(state)
        this.$effect = effect
        this.$stop = stop




        for (const key in state) {
            Object.defineProperty(this, key, {
                get: () => this.$state[key],
                set: (value) => {
                    this.$state[key] = value;
                },
            });
        }


        for (const key in derived) {
            const desc = derived[key];
            const target = desc.value || desc.get
            if (typeof target === "function") {
                this.$effect(() => { this.$state[key] = target.call(this.$state) })
            }
        }




        this._bindings = new Map()

        this.$alias = this.$dataset.alias


        this.$directives = { ...kitDirective(this), event: (el, expr, extra) => this._hanldeEvents(el, expr, extra) }
        this._destroyed = false;




        this.$binding(element)


    }

    KitComponent.prototype.$binder = function (element, extra = null) {
        if (!this.$binded.has(element)) {

            this.$binded.set(element, {
                events: [],
                effects: [],
                extra: extra,
            });
        }
        return this.$binded.get(element);
    }

    KitComponent.prototype.$addEffect = function (element, func) {
        const effect = this.$effect(func)
        this.$binder(element).effects.push(effect)
    }

    KitComponent.prototype.$addEvent = function (element, type, handler) {
        this.$binder(element).events.push({ type, handler })
    }



    KitComponent.prototype.$binding = function (element, skip = false, extra = {}) {
        // console.log(this._bindings)


        // chạy directive
        this.findDirectives(element).forEach(el => {
            if (!this.$element.contains(el)) return
            for (const [directive, handler] of Object.entries(this.$directives)) {
                if (skip && directive === skip) continue


                const attr = this.$directive(directive);
                const expr = el.getAttribute(attr);
                if (expr != null) {

                    handler(el, expr, extra);
                }
            }

        });
    };


    KitComponent.prototype.$cleanup = function (element) {
        const list = Array.from(this.findDirectives(element))
        if (!list.includes(element)) { list.push(element) }
        list.forEach(el => {
            const binder = this.$binder(el)
            if (!binder) return;

            binder.effects.forEach(effect => this.$stop(effect))
            binder.events.forEach(({ type, handler }) => {
                switch (type) {
                    case "intersect":
                        handler.disconnect?.();
                        break;
                    default:
                        el.removeEventListener(type, handler);
                }
            })

            let test = this.$binded.delete(el)

        })

    }







    KitComponent.prototype.$attach = function (element = this.$element) {
        element[this.$symbol] = this
        Object.defineProperty(element, "$component", {
            get: () => element[this.$symbol] = this,
            set: (v) => { element[this.$symbol] = v }
        });

        Object.defineProperty(element, "$parent", {
            get: () => element[this.$symbol].$parent,
            set: (v) => { element[this.$symbol] = v }
        });
    }

    KitComponent.prototype.findDirectives = function (element, isChild = true) {
        if (!element) return []

        const selector = Object.keys(this.$directives).map(dir => this.$selector(dir)).join(", ");


        let candidates = Array.from(element.querySelectorAll(selector));


        // nếu chính element match thì add trước
        if (element.matches(selector)) {
            candidates.push(element);
        }

        if (isChild === false) return candidates

        // lọc: chỉ giữ node thuộc root hiện tại
        return candidates.filter(el => {
            const parentComp = el.closest("[data-kit-component]");
            return parentComp === this.$element; // chỉ lấy trong component này
        });

    }





    KitComponent.prototype._hanldeEvents = function (node, raw, extra = {}) {
        const exprs = this._parseExpr(raw)
        if (typeof exprs === 'object') {
            for (const [eventer, expr] of Object.entries(exprs)) {

                switch (eventer) {
                    case "click-outside":
                        const selector = this.$selector("ignore", "outside")
                        const ignores = this.$element.querySelectorAll(selector)
                        const exceptions = ignores.length > 0 ? ignores : [this.$element]
                        this._handleOutside(expr, exceptions, node);
                        break;

                    case "intersect":
                    // case "intersect-enter":
                    case "leave":
                    // case "intersect-leave":
                    case "appear":
                    // case "intersect-once":
                    case "exit":
                        // case "intersect-exit":

                        this._handleIntersect(expr, eventer, node);
                        break;
                    default:
                        const handler = e => this.$evaluator(expr, node, e, extra);
                        const { event, timer } = parseEvents(eventer)

                        if (timer == 0) {
                            node.addEventListener(event, handler);
                            this.$addEvent(node, { type: event, handler });
                            break;
                        }

                        const finalHandler = debounce(handler, timer, this);
                        node.addEventListener(event, finalHandler);
                        this.$addEvent(node, { type: event, handler });
                        break;

                }
            }
            return
        }

        if (typeof exprs === 'string') {
            let event;
            const tag = node.tagName.toLowerCase();
            switch (tag) {
                default:
                    event = "click";
            }
            const handler = e => this.$evaluator(exprs, node, e, extra);

            node.addEventListener(event, handler);
            this.$addEvent(node, { type: event, handler });
            return
        }
    }


    Object.defineProperty(KitComponent.prototype, "$context", {
        get: function () {
            return this[this.$symbol]
        }
    });

    // Object.defineProperty(KitComponent.prototype, "$parent", {
    //     get: function () {

    //         return $parent
    //     }
    // });






    Object.defineProperty(KitComponent.prototype, "$refs", {
        get: function () {

            if (this._refs && this._refs.size > 0) {
                return this._refs
            }
            this._refs = this.$collect("ref")
            return this._refs
        }
    });


    KitComponent.prototype.$ref = function (key) {
        return this.$refs.get(key) || null
    }


    Object.defineProperty(KitComponent.prototype, "$items", {
        get: function () {
            if (this._items && this._items.size > 0) {
                return this._items
            }
            this._items = this.$collect("item")
            return this._items
        }
    });

    KitComponent.prototype.$item = function (key) {
        return this.items.get(key) || null
    }

    KitComponent.prototype.$collection = function (directive, target) {
        return Object.fromEntries(this.$collect(directive))
    }


    KitComponent.prototype.$collect = function (directive, target) {
        const result = new Map()
        const elements = this.$references(directive, target)
        const attribute = this.$directive(directive)

        elements.forEach(item => {
            const key = item.getAttribute(attribute)
            result.set(key, item)
        })
        return result
    }


    KitComponent.prototype.$references = function (directive, target) {
        const selector = this.$selector(directive, target)
        return this.$element.querySelectorAll(selector) || []
    }


    KitComponent.prototype.$directive = function (dir) {
        return [this.$prefix, this.$kit, dir].filter(Boolean).join("-")
    }


    KitComponent.prototype.$selector = function (dir, target) {
        const attr = this.$directive(dir)
        if (target) return `[${attr}=${target}]`
        return `[${attr}]`
    }

    KitComponent.prototype.$expression = function (expr) {
        let result = kitExpression(expr)

        if (Object.keys(result).length === 0) {
            return expr
        }
        return result
    }

    KitComponent.prototype._parseExpr = function (expr) {
        let result = kitExpression(expr)

        if (Object.keys(result).length === 0) {
            return expr
        }
        return result
    }

    KitComponent.prototype.$compile = function (expr) {
        if (!this.$compiles.has(expr)) {
            this.$compiles.set(expr, kitCompile(expr));
        }
        return this.$compiles.get(expr);
    }

    KitComponent.prototype.$evaluator = function (expr, element = null, event = null, extra = {}) {
        try {

            if (!expr) return;
            let expression = expr.trim();

            const fn = this.$compile(expression);

            var index;
            if (extra && Object.keys(extra).length > 0) {
                if (extra.$item) {
                    extra.$index = extra.$item.$index
                    extra.$even = extra.$item.$even
                    extra.$odd = extra.$item.$odd
                    extra.$count = extra.$item.$count
                    extra.$first = extra.$item.$first
                    extra.$last = extra.$item.$last
                    if (extra.$implicit) {
                        let itemAlias = extra.$implicit.$item
                        if (itemAlias) { extra[itemAlias] = extra.$item }

                        for (const [key, val] of Object.entries(extra.$implicit)) {

                            if (key in extra) {
                                extra[val] = extra[key]
                            }
                        }
                    }
                }
            }




            const context = {
                $parent: this.$parent,
                $event: event,
                $el: element,
                ...extra,
                ...this.$methods,
            };


            // nếu có assign thì ưu tiên gán
            if (typeof fn.assign === "function" && /\=/.test(cacheKey)) {
                return fn.assign(this.$state, extra.value, context);
            }

           
            
            // đảm bảo this = node
            return fn.call(element, this.$state, context);

        } catch (err) {
            console.error("[kitComponent._eval] Error evaluating expression:", expr, err);
            return undefined;
        }
    }





    KitComponent.prototype._handleOutside = function (expr, exceptions = [], node) {
        const whitelist = Array.from(new Set(exceptions)); // loại trùng
        const handler = (e) => {
            const target = e.target;
            const isInside = whitelist.some(el => el.contains(target));
            if (isInside) return;
            this.$evaluator(expr, node, e);
        };
        document.addEventListener("click", handler);
        this.$addEvent(document, "click", handler)
        // this._events.push({ node: document, event: "click", handler });
    }

    KitComponent.prototype._handleIntersect = function (expr, type, el) {
        if (!el) return;

        // Map type thành event + once
        const mapType = {
            "appear": { event: "enter", once: true },    // enter 1 lần
            "intersect": { event: "enter", once: false },// enter nhiều lần
            "leave": { event: "leave", once: false },    // leave nhiều lần
            "exit": { event: "leave", once: true }       // leave 1 lần
        };

        const typeInfo = mapType[type];
        if (!typeInfo) return;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                const isEnter = entry.isIntersecting;
                const isLeave = !entry.isIntersecting;

                if ((typeInfo.event === "enter" && isEnter) ||
                    (typeInfo.event === "leave" && isLeave)) {

                    // Gọi callback
                    this.$evaluator(expr, el);

                    // Nếu once, ngừng quan sát element
                    if (typeInfo.once) {
                        obs.unobserve(el);
                    }
                }
            });
        }, { threshold: 0 });

        // Bắt đầu quan sát
        observer.observe(el);

        // Lưu observer để destroy sau này
        // this._events.push({ node: el, event: "intersect", handler: observer });
        this.$addEvent(el, "intersect", observer)
    };





    KitComponent.prototype._kitDestroy = function () {
        if (this._destroyed) return;
        this._destroyed = true;

        // Hủy tất cả event listeners
        this._events.forEach(({ node, event, handler }) => {
            switch (event) {
                case "intersect":
                    handler.disconnect?.();
                    break;
                default:
                    node.removeEventListener(event, handler);
            }

        });
        this._events = [];

        // Hủy effect nếu hệ thống reactive hỗ trợ cleanup
        if (typeof this.$effect.cleanup === 'function') {
            this.$effect.cleanup(); // tuỳ theo bạn implement reactive ra sao
        }




        // Optionally: xóa mọi thứ liên quan
        this.$element._kits?.delete(this.$name);
        this.$element = null;
        this.$state = null;
        this._methods = null;
        this._directives = null;
        this.$dataset = null;
    };

    KitComponent.prototype.$debounce = function (fn, delay) {
        return debounce(fn, delay, this)
    }

    function debounce(fn, delay, thisTarget) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(thisTarget, args), delay);
        };
    };



    function normalizeOptions(options) {

        if ('state' in options || 'methods' in options || 'computed' in options) {
            return {
                state: JSON.parse(JSON.stringify(options.state)),
                methods: Object.assign({}, options.methods),
                derived: Object.getOwnPropertyDescriptors(options.computed || {})
            };
        }

        return parseOptions(options); // function bạn đã có sẵn
    }

    function parseOptions(options) {
        var state = {};
        var methods = {};
        var derived = {}
        const descriptors = Object.getOwnPropertyDescriptors(options)
        for (const key in descriptors) {
            const desc = descriptors[key]
            if (typeof descriptors[key].get === 'function') {
                derived[key] = desc
                continue;
            }
            if (typeof descriptors[key].value === 'function') {
                methods[key] = desc.value
                continue;
            }
            state[key] = desc.value
        }
        return { state, methods, derived }
    }



    function extractDataset(element, name, prefix) {
        if (!element) return null;
        const result = {};

        const startAttr = prefix ? [prefix, name].join("-") : name;

        for (const attr of element.getAttributeNames()) {
            if (attr.startsWith(startAttr + "-")) {
                const shortKey = attr.slice((startAttr + "-").length);
                const shortKeySplit = shortKey.split("-");

                // camelCase giống dataset
                const finalKey = shortKeySplit
                    .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
                    .join("");

                result[finalKey] = element.getAttribute(attr);
            }
        }
        return result;
    }




    function parseEvents(eventText) {
        if (!eventText.endsWith(")")) return { event: eventText, timer: 0 }

        const match = eventText.match(/^(\w+)\((\d+)\)$/);
        if (!match) return { event: eventText, timer: 0 };

        return {
            event: match[1],        // e.g., "input"
            timer: parseInt(match[2]) // e.g., 500
        };
    }

    // const instance = (el, op, at) => new KitComponent(el, op, at)
    // kitmodule.component = instance;
    kitmodule.component = KitComponent;

})(typeof window !== 'undefined' ? window : globalThis);


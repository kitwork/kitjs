(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { component: kitComponent, scriptVersion: kitScriptVersion, scriptParam: kitScriptParam } = kitmodule
    const sourceScript = document.currentScript.src
    const kit = "kit"

    function KitComponents() {

        this.kit = kit
        this.prefix = "data"
        this.symbol = Symbol(kit)
        this.component = "scope"
        this.attribute = ([this.prefix, this.kit, this.component].filter(Boolean)).join("-")
        this.selector = `[${this.attribute}]`
        this.observing = false;
        this.registers = new Map();   // Lưu component đã define
        this.instances = new WeakMap(); // Lưu instance component đang hoạt động
        this.aliases = new Map(); // Lưu các component có bí danh
        this.aliaser = {}


        this.version = kitScriptVersion(sourceScript) || null;
    }

    KitComponents.prototype.target = function (name) {
        return `[${this.attribute}="${name}"]`
    };

    KitComponents.prototype.targets = function (name) {
        return `${this.target(name)}, ${this.target(`$${name}`)} `
    };

    KitComponents.prototype.is = function (element) {
        return element.hasAttribute(this.attribute)
    };

    KitComponents.prototype.get = function (element) {
        return this.instances.get(element) || null
    };

    KitComponents.prototype.find = function (element, name) {
        if (name) return element.querySelectorAll(this.targets(name)) || []
        return element.querySelectorAll(this.selector) || []
    };

    KitComponents.prototype.ready = function () {
        document.addEventListener('DOMContentLoaded', () => {
            const elements = this.find(document);
            elements.forEach(el => { this.register(el) });
        });
        return this
    };

    KitComponents.prototype.define = function (name, options = {}) {

        this.registers.set(name, options);
        // const elements = this.find(document, name);
        // elements.forEach(el => this.register(el));
    };



    KitComponents.prototype.addAlias = function (instance) {
        const alias = instance.$alias
        if (!alias) return
        if (this.aliases.has(alias)) {
            console.error("duplicate alias ", alias)
            return
        }
        this.aliases.set(alias, instance)

        Object.defineProperty(this.aliaser, alias, {
            get: () => this.aliases.get(alias),
            configurable: true,
            enumerable: true,
        });

    };

    KitComponents.prototype.name = function (element) {
        const name = element.getAttribute(this.attribute);
        return name.startsWith('$') ? name.slice(1) : name;
    };

    KitComponents.prototype.parent = function (element) {
        const parent = element.parentElement?.closest(this.selector);
   
        return parent ? this.instances.get(parent) : null;
    };


    KitComponents.prototype.register = function (element) {
        const name = this.name(element);
        const options = this.registers.get(name) || {};

        if (!this.instances.has(element)) {
         
            const instance = new kitComponent(element, options, this);
            this.instances.set(element, instance);
            instance.initial?.();
            this.addAlias(instance)
        } 
    };


    KitComponents.prototype.destroy = function (element) {
        const instance = this.instances.get(element);
        if (instance) {
            // if (typeof instance._alias === "function") {
            //     const alias = instance.$alias
            //     if (alias && !this.aliases.hasOwnProperty(alias) && this.aliases[alias] === instance) {
            //         delete this.aliases[alias];
            //     }
            // }
            if (typeof instance.destroy === "function") {
                instance._kitDestroy();
            }

        }
        this.instances.delete(element);
    };

    KitComponents.prototype.observe = function () {
        if (this.observing) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    if (this.is(node)) {
                        this.register(node);
                    }

                    const inner = this.find(node);
                    inner?.forEach(el => this.register(el));

                }

                for (const node of mutation.removedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    if (this.is(node)) {
                        this.destroy(node);
                    }

                    const inner = this.find(node);
                    inner?.forEach(el => this.destroy(el));
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        this.observing = true;
    };

    // Thủ công refresh lại toàn bộ DOM
    KitComponents.prototype.refresh = function () {
        document.querySelectorAll(selector).forEach(el => this.register(el));
    };

    // Gán instance ra global
    const instance = new KitComponents();


    kitmodule.components = instance;
    global.Kit = instance
    global[kit] = instance.aliaser
    instance.ready().observe();
})(typeof window !== 'undefined' ? window : globalThis);

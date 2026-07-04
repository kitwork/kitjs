/*!
 * KitQuery v1.0.0
 * Author:   Huỳnh Nhân Quốc
 * Copyright (c) 2025 KITMODULE
 * Website:  https://kitmodule.com
 * GitHub:   https://github.com/kitmodule
 * License:  MIT
 */

(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});

    /**
     * KitQuery - Utility for working with URL query parameters.
     * Provides chainable methods: get, set, add, with, remove, assign, clean.
     *
     * @param {string} [href=window.location.href] - The URL to operate on.
     */
    function KitQuery(href = window.location.href) {
        this.url = new URL(href, window.location.origin);
        this.params = this.url.searchParams;
    }


    /** reset  */
    KitQuery.prototype.reset = function (href = window.location.href) {
        this.url = new URL(href, window.location.origin);
        this.params = this.url.searchParams;
        return this
    };


    /** Get a parameter value or all parameters as an object */
    KitQuery.prototype.get = function (key) {
        if (typeof key === "undefined") {
            return this.toObject();
        }
        return this.params.get(key);
    };

    /** Convert all parameters to a plain object */
    KitQuery.prototype.toObject = function () {
        const result = {};
        for (const [k, v] of this.params.entries()) {
            if (result.hasOwnProperty(k)) {
                result[k] = Array.isArray(result[k]) ? [...result[k], v] : [result[k], v];
            } else {
                result[k] = v;
            }
        }
        return result;
    };

    /** Convert parameters to query string */
    KitQuery.prototype.toString = function () {
        return this.params.toString();
    };


    KitQuery.prototype.toSearch = function () {
        let str = this.toString();
        if (!str) return ""; 
        return str.startsWith("?") ? str : "?" + str;
    };

    /** Set parameter(s), overwrite existing values */
    KitQuery.prototype.set = function (...args) {
        return this._handleArgs(args, (k, v) => this.params.set(k, v));
    };

    /** Add parameter(s), always append */
    KitQuery.prototype.add = function (...args) {
        return this._handleArgs(args, (k, v) => this.params.append(k, v));
    };

    /** Set parameter(s) only if not already present */
    KitQuery.prototype.with = function (...args) {
        return this._handleArgs(args, (k, v) => {
            if (!this.params.has(k)) this.params.set(k, v);
        });
    };

    /** Remove a single parameter */
    KitQuery.prototype.delete = function (key) {
        this.params.delete(key);
        return this;
    };

    /** Remove multiple parameters */
    KitQuery.prototype.remove = function (...keys) {
        keys.forEach(k => this.params.delete(k));
        return this;
    };


    /** Replace all parameters with new ones */
    KitQuery.prototype.assign = function (...args) {
        return this.clean().set(...args);
    };

    /** Get a parameter and remove it */
    KitQuery.prototype.extract = function (key) {
        const value = this.get(key);
        if (value !== null) this.remove(key);
        return value;
    };

    /** Clear all parameters */
    KitQuery.prototype.clean = function () {
        this.params = new URLSearchParams();
        this.url.search = "";
        return this;
    };

    /** Replace current browser URL without reloading */
    KitQuery.prototype.replaceState = function (data = {}) {
        return this.state("replace", data);
    };

    /** Push new browser URL without reloading */
    KitQuery.prototype.pushState = function (data = {}) {
        return this.state("push", data);
    };

    /**
    * Update the URL without reloading the page
    * @param {"push"|"replace"} type - The type of history state to use
    * @param {Object} data - Data to store in history.state
    */
    KitQuery.prototype.state = function (type = "replace", data = {}) {
        const newSearch = this.params.toString();
        const newUrl = `${this.url.pathname}${newSearch ? `?${newSearch}` : ""}${this.url.hash}`;

        if (type === "push") {
            window.history.pushState(data, null, newUrl);
        } else {
            window.history.replaceState(data, null, newUrl);
        }

        return this;
    };


    /**
 * Increase the page parameter by 1.*/
    KitQuery.prototype.next = function (key = "page") {
        let current = parseInt(this.get(key) || "1", 10);
        if (isNaN(current) || current < 1) current = 1;
        this.set(key, current + 1);
        return this;
    };

    /**
     * Decrease the page parameter by 1 (with a minimum of 1).*/
    KitQuery.prototype.previous = function (key = "page") {
        let current = parseInt(this.get(key) || "1", 10);
        if (isNaN(current) || current <= 1) {
            current = 1;
        } else {
            current = current - 1;
        }
        this.set(key, current);
        return this;
    };

    /**
 * Jump to a specific page number.*/
    KitQuery.prototype.goto = function (page, key = "page") {
        let target = parseInt(page, 10);
        if (isNaN(target) || target < 1) target = 1;
        this.set(key, target);
        return this;
    };

    /**
     * Internal helper for handling arguments in set/add/with.
     * Supports:
     *   - Object: { key: value }
     *   - Pair: "key", "value"
     *   - Multiple pairs: "key1", "value1", "key2", "value2"
     */
    KitQuery.prototype._handleArgs = function (args, handler) {
        if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
            for (const [k, v] of Object.entries(args[0])) {
                handler(k, v);
            }
        } else if (args.length === 2) {
            handler(args[0], args[1]);
        } else if (args.length > 2 && args.length % 2 === 0) {
            for (let i = 0; i < args.length; i += 2) {
                handler(args[i], args[i + 1]);
            }
        } else {
            throw new Error("Invalid arguments");
        }
        return this;
    };

    kitmodule.query = new KitQuery();

})(typeof window !== "undefined" ? window : globalThis);

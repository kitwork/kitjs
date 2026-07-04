/*!
 * KitCookie v1.0.0
 * Author:   Huỳnh Nhân Quốc
 * Copyright (c) 2025 KITMODULE
 * Website: https://kitmodule.com
 * GitHub:  https://github.com/kitmodule
 * License: MIT
 */

(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});

    function KitCookie() {}

    // Encode helper
    KitCookie.prototype._encode = function (value, method = "uri") {
        if (value == null) return "";
        switch (method) {
            case "base64":
                return btoa(unescape(encodeURIComponent(value)));
            case "none":
                return value;
            case "uri":
            default:
                return encodeURIComponent(value);
        }
    };

    // Decode helper
    KitCookie.prototype._decode = function (value, method = "uri") {
        if (!value) return "";
        switch (method) {
            case "base64":
                return decodeURIComponent(escape(atob(value)));
            case "none":
                return value;
            case "uri":
            default:
                return decodeURIComponent(value);
        }
    };

    // Set cookie
    KitCookie.prototype.set = function (name, value, options = {}) {
        let encodedValue = this._encode(value, options.encode);
        let cookieStr = name + "=" + encodedValue;

        if (options.expires) {
            const d = new Date();
            if (typeof options.expires === "number") {
                d.setTime(d.getTime() + options.expires * 24 * 60 * 60 * 1000);
            } else if (options.expires instanceof Date) {
                d.setTime(options.expires.getTime());
            }
            cookieStr += "; expires=" + d.toUTCString();
        }

        cookieStr += "; path=" + (options.path || "/");
        if (options.domain) cookieStr += "; domain=" + options.domain;
        if (options.secure) cookieStr += "; secure";
        if (options.sameSite) cookieStr += "; samesite=" + options.sameSite;

        document.cookie = cookieStr;
    };

    // Get cookie (or all if no name)
    KitCookie.prototype.get = function (name, options = {}) {
        const cookies = document.cookie.split(";").reduce((acc, c) => {
            let [k, v] = c.split("=");
            if (k) acc[k.trim()] = v ? v.trim() : "";
            return acc;
        }, {});

        if (!name) {
            // Decode all
            for (let k in cookies) {
                cookies[k] = this._decode(cookies[k], options.decode);
            }
            return cookies;
        }

        if (!(name in cookies)) return undefined;
        return this._decode(cookies[name], options.decode);
    };

    // Check if cookie exists
    KitCookie.prototype.has = function (name) {
        return this.get(name) !== undefined;
    };

    // Remove cookie
    KitCookie.prototype.remove = function (name, options = {}) {
        document.cookie =
            name +
            "=; expires=Thu, 01 Jan 1970 00:00:00 UTC" +
            "; path=" + (options.path || "/") +
            (options.domain ? "; domain=" + options.domain : "");
    };

    // Clean all cookies
    KitCookie.prototype.clean = function () {
        const cookies = this.get();
        for (let name in cookies) {
            this.remove(name);
        }
    };

    // expose instance 
    kitmodule.cookie = new KitCookie();

})(typeof window !== "undefined" ? window : globalThis);

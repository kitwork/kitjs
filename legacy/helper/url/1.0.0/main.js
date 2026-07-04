(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { query: KitQuery } = kitmodule

    function KitURL(href = window.location.href) {
        this.url = new URL(href);
        this.params = this.url.searchParams;
    }

    KitURL.prototype.query = function () {
        return KitQuery(this.url)
    }

    KitURL.prototype.getParam = function (key) {
        return this.params.get(key);
    };

    KitURL.prototype.getParams = function () {
        const result = {};
        for (const [key, value] of this.params.entries()) {
            if (result.hasOwnProperty(key)) {
                if (Array.isArray(result[key])) {
                    result[key].push(value);
                } else {
                    result[key] = [result[key], value];
                }
            } else {
                result[key] = value;
            }
        }
        return result;
    };

    KitURL.prototype.deleteParam = function (key) {
        this.params.delete(key);
        return this;
    };

    KitURL.prototype.extractParam = function (key) {
        const value = this.getParam(key);
        if (value !== null) this.deleteParam(key);
        return value;
    };

    KitURL.prototype.replaceState = function () {
        const newSearch = this.params.toString();
        const newUrl = `${this.url.pathname}${newSearch ? `?${newSearch}` : ''}${this.url.hash}`;
        window.history.replaceState({}, '', newUrl);
        return this;
    };


    kitmodule.url = KitURL


})(typeof window !== "undefined" ? window : globalThis);
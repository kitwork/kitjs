(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});

    function KitScript(source) {
        this.source = source
    }

    KitScript.prototype.version = function () {
        // Nếu không truyền url thì mặc định lấy script hiện tại

        if (!this.source) return null;

        // Regex tìm version dạng x.y.z
        let match = this.source.match(/\/(\d+\.\d+\.\d+)\//);
        return match ? match[1] : null;
    }

    KitScript.prototype.param = function (param) {
        const searchParams = new URL(this.source).searchParams;
        const value = searchParams.get(param)
        if (searchParams.has(param)) return value
        return undefined
    }

    kitmodule.scriptParam = (source, param) => new KitScript(source).param(param)
    kitmodule.scriptVersion = (source) => new KitScript(source).version()


})(typeof window !== "undefined" ? window : globalThis);


(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    const { query: KitQuery } = kitmodule

    function KitURL(href = window.location.href) {
        this.url = new URL(href);
        this.params = this.url.searchParams;
        this.query = KitQuery(this.url)
    }


    kitmodule.url = KitURL


})(typeof window !== "undefined" ? window : globalThis);
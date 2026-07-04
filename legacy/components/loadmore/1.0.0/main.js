Kit.define("loadmore", {
    auto: true,
    loading: false,
    lazy(el) {
        el.addEventListener("click", (event) => {
            this.loading = true;
            if (el.tagName !== "A") { event.preventDefault(); event.stopPropagation(); }
        });
        if (this.auto) el.click()
    },
})
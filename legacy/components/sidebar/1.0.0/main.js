Kit.define("sidebar", {
    open: false,
    initial() { this.$effect(() => { this.setCookie(this.open) }) },
    setCookie(value) {
        const { cookie } = kitmodule
        
        const key = "sidebar"
        if (value) {
            cookie.set(key, value)
        } else {
            cookie.remove(key)
        }

    },
    toggel() { this.open = !this.open }
})
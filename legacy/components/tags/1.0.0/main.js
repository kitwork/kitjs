Kit.define("tags", {
    open: false,
    max: 256,
    items: ["1a", "2b", "3c", "4d"],
    hello: "hello",
    del(index) {
        console.log(index)
        this.items.splice(index, 1)
    },
    initial() {
        console.log(123)
    },

})  
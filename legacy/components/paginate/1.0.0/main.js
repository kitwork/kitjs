Kit.define("paginate", {
    current: 1,
    count: null,
    last: null,
    first: 1,
    limit: null,
    from: null,
    to: null,
    initial() {
        this.updateFromTo()
    },
    goto(page) {
        const pageNumber = Number(page)
        this.current = pageNumber
        this.updateFromTo()
    },
    updateFromTo() {
        if (this.limit && this.current && this.count) {
            this.from = ((this.current - 1) * this.limit) + 1

            this.to = this.current * this.limit
            if (this.to > this.count) this.to = this.count
        }
    }
})
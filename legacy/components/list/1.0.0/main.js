Kit.define("list", {
    // State
    loading: false,
    isEmpty: false,
    keyword: "",
    historyState: "push",
    scrollBehavior: "auto",
    pushCount: 0,
    autoload: 2,

    /** Initialize component */
    initial() {
        this.search = this.$debounce(this.search, 345);
        this.query = kitmodule.query;
        this.pushCount = 0;

        // Cleanup nếu có popstate cũ
        if (this.popstate) {
            window.removeEventListener("popstate", this.popstate);
        }

        // Định nghĩa popstate mới
        this.popstate = (event) => this.handlePopstate(event);
        window.addEventListener("popstate", this.popstate);
        if (typeof this.autoload === "number") this._autoload = this.autoload

    },

    /** Handle popstate events */
    handlePopstate(event) {
        this.query.reset();
        this.loadFromQuery();

        if (!event.state) {
            this.pushCount = 0; // về trạng thái gốc
            return;
        }

        if (event.state.type === "list") {
            const index = event.state.index ?? 0;
            if (index < this.pushCount) this.pushCount--;
            if (index > this.pushCount) this.pushCount++;
        }
    },

    /** Scroll lên top */
    scrollToTop() {
        this.$element.scrollIntoView({ behavior: this.scrollBehavior });
    },

    /** Ẩn/hiện paginate */
    togglePaginate(hidden = true) {
        const paginate = this.$element.querySelector(this.$selector("ref", "paginate"));
        if (paginate) paginate.hidden = hidden;
    },

    /** Lưu state vào history */
    dataState() {
        return {
            index: this.pushCount++,
            url: this.query.toSearch(),
            type: "list"
        };
    },

    /** Tìm kiếm */
    async search(query = {}) {
        const { search: keyword } = query;
        if (keyword === this.keyword) return;

        this.keyword = keyword;
        this.togglePaginate();

        const target = this.query
            .assign(query)
            .state(this.historyState, this.dataState())
            .toSearch();

        this.getPage(target);
    },

    /** Load lại dữ liệu khi popstate */
    loadFromQuery() {
        this.scrollToTop();
        this.togglePaginate();
        this.getPage(this.query.toSearch());
    },

    /** Chuyển trang */
    async goto(page) {
        this.scrollToTop();
        const target = this.query
            .goto(page)
            .state(this.historyState, this.dataState())
            .toSearch();
        this.getPage(target);
    },

    /** Đổi limit */
    async limit(value) {
        this.scrollToTop();
        this.togglePaginate();
        const target = this.query
            .set("limit", value, "page", 1)
            .state(this.historyState, this.dataState())
            .toSearch();
        this.getPage(target);
    },

    /** Fetch và render page mới */
    async getPage(target) {
        this.loading = true;
        this.isEmpty = false;

        const page = await this.fetchPageElement(target);
        if (!page) return;
        this.loading = false;
        this.render(page);
    },

    /** Render lại content + paginate */
    render(page) {
        const contentSelector = this.$selector("ref", "content");
        const newContent = page.querySelector(contentSelector);
        const currentContent = this.$element.querySelector(contentSelector);

        console.log(contentSelector)
        const itemSelector = this.$selector("item");

        this.isEmpty = newContent.querySelector(itemSelector) === null;
        currentContent.innerHTML = newContent.innerHTML;

        const paginateSelector = this.$selector("ref", "paginate");
        const newPaginate = page.querySelector(paginateSelector);
        const currentPaginate = this.$element.querySelector(paginateSelector);

        if (newPaginate && currentPaginate) {
            if (!this.isEmpty) {
                currentPaginate.hidden = false;
                currentPaginate.innerHTML = newPaginate.innerHTML;
            } else {
                currentPaginate.hidden = true;
            }
        }
    },

    async loadmore(target) {
        const page = await this.fetchPageElement(target);
        if (!page) return;


        const contentSelector = this.$selector("ref", "content");
        const newContent = page.querySelector(contentSelector);
        const currentContent = this.$element.querySelector(contentSelector);

        if (!newContent || !currentContent) return;

        const itemSelector = this.$selector("item");
        this.isEmpty = newContent.querySelector(itemSelector) === null;

        const newItems = newContent.querySelectorAll(itemSelector)
        // Duyệt qua các item mới và append nếu chưa có
        Array.from(newItems).forEach(el => {
            const node = el.getAttribute(this.$directive("item"));
            if (!this.$items.has(node)) {
                currentContent.appendChild(el.cloneNode(true));
                this.$items.set(node, el); // cập nhật map cache
            }
        })

        const loadmoreSelector = this.$selector("ref", "loadmore");
        const newLoadmore = page.querySelector(loadmoreSelector);
        const currentLoadmore = this.$element.querySelector(loadmoreSelector);

        if (newLoadmore) {
            const loadmoreEl = newLoadmore.querySelector(`[data-kit-component=loadmore]`)
            if (loadmoreEl && typeof this.autoload === "number") {
                this.autoload--
                if (this.autoload < 1) {
                    loadmoreEl.setAttribute("data-loadmore-state-auto", false)
                    this.autoload = this._autoload + 1
                }
            }
            currentLoadmore.innerHTML = newLoadmore.innerHTML;
        }


    },



    /** Fetch page HTML và parse */
    async fetchPageElement(url, targetSelector = this.$itself) {


        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        console.log(targetSelector)
        return doc.querySelector(targetSelector);
    }
});

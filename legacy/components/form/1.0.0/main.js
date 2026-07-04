Kit.define("form", {
    validity: false,
    loading: false,
    error: "",
    success: "",

    async submit(event) {
        if (!event) return;
        event.preventDefault();
        const element = event.target;

        const action = element.action;
        const method = (element.method || "get").toLowerCase();

        this.loading = true;
        this.error = "";
        this.success = "";

        const formData = await this.getFromData(element);

        try {
            const options = { method };

            if (method !== "get" && [...formData.entries()].length) {
                options.body = formData;
            }

            const response = await fetch(action, options);
            const { success, redirect, message } = await response.json();

            if (success) {
                if (redirect) {
                    location.assign(redirect);
                    return;
                }

                const next = this.getNext();
                if (next) {
                    location.assign(next);
                    return;
                }
                this.success = message
                return;
            }

            if (message) this.error = message;
        } catch (error) {

            this.error = error?.message || String(error);
            console.error(error);
        } finally {
            this.loading = false;
        }
    },
    async getFromData(element) {
        const encodeElements = element.querySelectorAll('[data-form-encode]') || [];
        const formData = new FormData(element);

        const { hasher: kitHasher } = kitmodule

        if (encodeElements.length === 0) {
            return formData;
        }


        // Giả sử chỉ cần encode password 1 lần
        for (const el of encodeElements) {
            const name = el.name
            const value = el.value


            try {
                const token = await (new kitHasher(value)).fetch(name);

                if (token) {
                    formData.delete(name);
                    formData.append(name + "hash", token);
                }
            } catch (error) {
                console.log(error)
                this.error = "Lỗi khi fetch token:", error
                return
            }

        }

        return formData;
    },

    getNext() {
        const urlParams = new URLSearchParams(window.location.search);
        const next = urlParams.get('next');
        function isInternal(path) {
            if (!path) return false;
            try {
                const url = new URL(path, window.location.origin);
                return url.hostname === window.location.hostname;
            } catch (e) {
                return typeof path === 'string'
                    && path.startsWith('/')
                    && !path.startsWith('//')
                    && !path.includes('://');
            }
        }
        return isInternal(next) ? next : undefined;
    },

});

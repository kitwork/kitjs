Kit.define("qrlogin", {
    loading: false,
    mask: false,
    spinner: false,
    image: undefined,
    next: null,

    async connect(api = "/api/login/qrcode?next=/account") {


        this.api = api
        if (this.timeout) clearTimeout(this.timeout);
        if (this.eventSource) this.eventSource.close();
        this.loading = true;
        this.spinner = true;
        this.mask = false;

        try {
            const res = await fetch(api);
            const { success, data } = await res.json();
            if (!success) return;
            const { svg, expiration, listen } = data;

            this.image = svg;
            this.loading = false;

            let now = new Date();
            let expirate = new Date(expiration);
            let remaining = expirate.getTime() - now.getTime();

            this.timeout = setTimeout(() => {
                this.loading = true;
                this.mask = true;
                this.spinner = false;
                this.expiration = null;
                if (this.eventSource) this.eventSource.close();
            }, remaining);

            this.eventSource = new EventSource(listen);
            this.eventSource.onmessage = async (event) => {
                try {
                    const resp = await fetch(event.data);
                    const { success, redirect } = await resp.json();
                    this.eventSource.close();
                    if (success) {
                        var nextLink;
                        if (redirect) nextLink = redirect
                        else if (this.next) nextLink = this.next
                        else {
                            const params = new URLSearchParams(window.location.search);
                            const next = params.get('next');
                            if (next) nextLink = next
                        }
                        nextLink = this.isInternalLink(nextLink)
                        if (nextLink) location.assign(nextLink)
                        return
                    }

                } catch (err) {
                    console.error("QR Code auth error:", err);
                }
            };
            this.eventSource.onerror = (err) => {
                console.error("EventSource failed:", err);
            };

        } catch (error) {
            console.error("Failed to fetch QR code:", error);
        }
    },
    refresh() { this.connect(this.api); },
    isInternalLink(link) {
        // Xóa khoảng trắng đầu cuối
        if (!link) return false;
        link = link.trim();

        // Link rỗng hoặc anchor (#section) vẫn là nội bộ
        if (link.startsWith('#')) return true;

        // Nếu bắt đầu bằng http://, https://, hoặc // → link ngoài
        if (/^(https?:)?\/\//i.test(link)) {
            try {
                const currentHost = window.location.host;
                const url = new URL(link, window.location.origin);
                return url.host === currentHost;
            } catch {
                return false;
            }
        }

        // Nếu bắt đầu bằng /, ./ hoặc ../ hoặc không có domain → nội bộ
        return /^([./]?[^:]*|\/)/.test(link);
    }



});

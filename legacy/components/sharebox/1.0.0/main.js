Kit.define("sharebox", {
    // --- state ---
    url: "",
    title: "",
    description: "",
    image: "",
    isNavigatorShare: null,
    showing: false,
    backdrop: true,
    copied: null,
    error: "",

    // --- lifecycle ---
    initial() {
        this.isNavigatorShare = !!navigator.share;
    },

    // --- mở modal ---
    open(url, title, description, image) {
        this.showing = true;
        this.url = url;
        this.title = title || "";
        this.description = description || "";
        this.image = image || "";
    },

    // --- danh sách social (mở rộng dễ như shareon) ---
    getSocialUrls() {
        const url = encodeURIComponent(this.url);
        const title = encodeURIComponent(this.title || "");
        const description = encodeURIComponent(this.description || "");
        const image = encodeURIComponent(this.image || "");

        return {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
            pinterest: `https://pinterest.com/pin/create/button/?url=${url}&description=${description}&media=${image}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
            threads: `https://www.threads.net/intent/post?text=${title}%20${url}`,
            telegram: `https://t.me/share/url?url=${url}&text=${title}`,
            whatsapp: `https://wa.me/?text=${title}%20${url}`,
            line: `https://social-plugins.line.me/lineit/share?url=${url}`,
            reddit: `https://www.reddit.com/submit?url=${url}&title=${title}`,
            tumblr: `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${url}&title=${title}&caption=${description}`,
            skype: `https://web.skype.com/share?url=${url}&text=${title}`,
            vk: `https://vk.com/share.php?url=${url}&title=${title}&description=${description}&image=${image}`,
            xing: `https://www.xing.com/spi/shares/new?url=${url}`,
            pocket: `https://getpocket.com/edit?url=${url}&title=${title}`,
            hackernews: `https://news.ycombinator.com/submitlink?u=${url}&t=${title}`,
            blogger: `https://www.blogger.com/blog-this.g?u=${url}&n=${title}`,
            mailto: `mailto:?subject=${title}&body=${description}%0A${url}`,
            sms: `sms:?&body=${title}%20${url}`,
            viber: `viber://forward?text=${title}%20${url}`,
            wechat: `weixin://dl/businessWebview/link?url=${url}`,
        };
    },

    // --- core mở social ---
    onSocial(social) {
        const socialUrls = this.getSocialUrls();
        const shareUrl = socialUrls[social];
        if (shareUrl) {
            window.open(shareUrl, "_blank", "noopener,noreferrer");
        } else {
            console.warn("Chưa hỗ trợ nền tảng:", social);
        }
    },

    // --- native share ---
    async another() {
        try {
            const shareData = {
                title: this.title,
                text: this.description,
                url: this.url,
            };

            if (this.isNavigatorShare) {
                await navigator.share(shareData);
            } else {
                await this.copy();
            }
        } catch (err) {
            this.error = err;
            console.error(err);
        }
    },

    // --- copy API ---
    async copy(duration = 2468) {
        try {
            await this.copyToClipboard();
            this.copied = true;
            setTimeout(() => (this.copied = false), duration);
            return true;
        } catch (err) {
            this.error = err.message || "Copy failed";
            this.copied = false;
            return false;
        }
    },

    async copyToClipboard() {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(this.url);
        } else {
            return new Promise((res, rej) => {
                const textarea = document.createElement("textarea");
                textarea.value = this.url;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try {
                    document.execCommand("copy") ? res() : rej();
                } catch (err) {
                    rej(err);
                } finally {
                    document.body.removeChild(textarea);
                }
            });
        }
    },

    // --- tiện ích (alias) ---
    facebook() { this.onSocial("facebook"); },
    twitter() { this.onSocial("twitter"); },
    pinterest() { this.onSocial("pinterest"); },
    linkedin() { this.onSocial("linkedin"); },
    threads() { this.onSocial("threads"); },
    telegram() { this.onSocial("telegram"); },
    whatsapp() { this.onSocial("whatsapp"); },
    line() { this.onSocial("line"); },
    reddit() { this.onSocial("reddit"); },
    tumblr() { this.onSocial("tumblr"); },
    skype() { this.onSocial("skype"); },
    vk() { this.onSocial("vk"); },
    xing() { this.onSocial("xing"); },
    pocket() { this.onSocial("pocket"); },
    hackernews() { this.onSocial("hackernews"); },
    blogger() { this.onSocial("blogger"); },
    mailto() { this.onSocial("mailto"); },
    sms() { this.onSocial("sms"); },
    viber() { this.onSocial("viber"); },
    wechat() { this.onSocial("wechat"); },
});

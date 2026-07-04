(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});

    const defaultAllowedTags = [
        // HTML cơ bản
        "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
        "span", "div", "img", "h1", "h2", "h3", "h4", "h5", "h6",
        "table", "thead", "tbody", "tr", "td", "th",
        "blockquote", "code", "pre", "image",

        // SVG cơ bản
        "svg", "path", "circle", "rect", "line", "polygon", "polyline", "ellipse", "g",
        "defs", "linearGradient", "radialGradient", "stop", "filter", "feGaussianBlur",
        "feOffset", "feBlend", "feColorMatrix", "clipPath", "pattern", "use", "symbol"
    ];


    const defaultAllowedAttributes = {
        "a": ["href", "title", "target", "rel"],
        "img": ["src", "alt", "title", "width", "height"],
        "svg": ["viewBox", "viewbox", "width", "height", "xmlns", "fill", "stroke", "stroke-width", "role", "aria-hidden", "style"],

        "pattern": ["x", "y", "width", "height"],
        "path": ["d", "fill", "stroke", "stroke-width", "transform"],
        "circle": ["cx", "cy", "r", "fill", "stroke", "stroke-width"],
        "rect": ["x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width", "style"],
        "ellipse": ["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width"],
        "line": ["x1", "y1", "x2", "y2", "stroke", "stroke-width"],
        "polyline": ["points", "fill", "stroke", "stroke-width"],
        "polygon": ["points", "fill", "stroke", "stroke-width"],
        "text": ["x", "y", "fill", "font-size", "text-anchor", "transform"],
        "image": ["x", "y", "width", "height", "href", "xlink:href"],
        "use": ["href", "xlink:href", "width", "height", "x", "y"],
        "*": ["class", "id", "style"], // style vẫn bị loại bỏ ở bước dưới
    };

    const forbiddenTags = ["script", "style", "iframe", "object", "embed", "link", "meta"];

    function kitSanitize(inputHTML, options = {}) {
        const allowedTags = options.allowedTags || defaultAllowedTags;
        const allowedAttributes = options.allowedAttributes || defaultAllowedAttributes;

        const parser = new DOMParser();
        const doc = parser.parseFromString(inputHTML, "text/html");

        function isSafeUrl(url) {
            if (!url) return false;
            const safeProtocols = ["http:", "https:", "mailto:", "tel:", "data:"];
            try {
                const parsed = new URL(url, location.origin);
                return safeProtocols.includes(parsed.protocol);
            } catch {
                return false;
            }
        }

        function cleanNode(node) {
            let child = node.firstChild;
            while (child) {
                const next = child.nextSibling;

                if (child.nodeType === Node.ELEMENT_NODE) {
                    const tagName = child.tagName.toLowerCase();

                    if (forbiddenTags.includes(tagName) || !allowedTags.includes(tagName)) {
                        child.remove();
                    } else {
                        [...child.attributes].forEach(attr => {
                            const attrName = attr.name.toLowerCase();

                            const allowedForTag = allowedAttributes[tagName] || [];
                            const allowedForAll = allowedAttributes["*"] || [];
                            if (![...allowedForTag, ...allowedForAll].includes(attrName)) {
                                child.removeAttribute(attr.name);
                                return;
                            }

                            if (attrName.startsWith("on")) {
                                child.removeAttribute(attr.name);
                                return;
                            }

                            if (attrName === "style") {
                                const css = attr.value;
                                // Chặn các chuỗi nguy hiểm như javascript:, url(
                                if (/javascript:|expression\(|url\s*\(/i.test(css)) {
                                    child.removeAttribute(attr.name);
                                } else {
                                    // giữ lại
                                }
                                return;
                            }

                            // Check href/src for safe protocols
                            if ((attrName === "href" || attrName === "src" || attrName === "xlink:href") && !isSafeUrl(attr.value)) {
                                child.removeAttribute(attr.name);
                                return;
                            }

                            // target="_blank" safety
                            if (tagName === "a" && attrName === "target" && attr.value === "_blank") {
                                const rel = child.getAttribute("rel") || "";
                                if (!rel.includes("noopener")) {
                                    child.setAttribute("rel", (rel + " noopener noreferrer").trim());
                                }
                            }
                        });

                        cleanNode(child);
                    }
                } else if (child.nodeType === Node.COMMENT_NODE) {
                    child.remove();
                } else if (child.nodeType !== Node.TEXT_NODE) {
                    child.remove();
                }

                child = next;
            }
        }

        cleanNode(doc.body);

        return doc.body.innerHTML;
    }

    kitmodule.sanitizeHTML = kitSanitize;
})(typeof window !== "undefined" ? window : globalThis);

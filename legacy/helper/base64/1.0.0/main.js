(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});

    function KitBase64(charString) {
        this.charString = charString
    }


    KitBase64.prototype.encode = function () {
        if (typeof TextEncoder === 'undefined') {
            throw new Error('TextEncoder is not supported in this environment.');
        }
        const bytes = new TextEncoder().encode(this.charString);
        const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
        return btoa(binary);
    }

    KitBase64.prototype.decode = function () {
        if (typeof TextDecoder === 'undefined') {
            throw new Error('TextDecoder is not supported in this environment.');
        }
        const binary = atob(this.charString);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    kitmodule.base64 = KitBase64;
    kitmodule.base64Encode = (text) => new KitBase64(text).encode()
    kitmodule.base64Decode = (text) => new KitBase64(text).decode()

})(typeof window !== "undefined" ? window : globalThis);

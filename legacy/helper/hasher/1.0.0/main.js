(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});

    const kitMinimize = (v) => new kitmodule.minimize(v)
    const kitBase64 = (v) => new kitmodule.base64(v)

    
    function KitHasher(input) {
        this.value = input
        this.ensign = null
    }

    function extractDigits(str) {
        return str.split('').filter(c => c >= '0' && c <= '9').join('')
    };

    KitHasher.prototype.decodeRemaining = function (encodedRemaining, base62) {
        const numericBase = extractDigits(base62);
        const bigintValue = kitMinimize(base62).toBigInt(encodedRemaining);
        const decimalStr = kitMinimize(numericBase).toBigInt(bigintValue);
        return Number(decimalStr);
    }

    KitHasher.prototype.decode = function (hashToken) {
        const BASE_LENGTH = 62;

        if (hashToken.length <= BASE_LENGTH + 2) {
            throw new Error("Token không hợp lệ: độ dài quá ngắn.");
        }

        // Tách base và phần còn lại
        const base = hashToken.slice(0, BASE_LENGTH);
        let rest = hashToken.slice(BASE_LENGTH);

        // Lấy salt1 và độ dài created
        const salt1 = rest[0];
        const createdLength = base.indexOf(salt1);
        if (createdLength < 0) throw new Error("Salt1 không hợp lệ.");
        rest = rest.slice(1);

        // Lấy phần created
        const created = rest.slice(0, createdLength);
        rest = rest.slice(createdLength);

        // Lấy salt2 và độ dài remaining
        const salt2 = rest[0];
        const remainingLength = base.indexOf(salt2);
        if (remainingLength < 0) throw new Error("Salt2 không hợp lệ.");
        rest = rest.slice(1);

        // Lấy phần remaining
        const remainingHash = rest.slice(0, remainingLength);
        // Giải mã remaining thành Unix timestamp
        const remainingString = this.decodeRemaining(remainingHash, base);
        const remaining = Number(remainingString)



        const expirated = new Date(Date.now() + remaining)

        return { base, created, remaining, expirated };
    }

    KitHasher.prototype.encode = function (hash) {
        let { base } = this.decode(hash)
        let text64 = kitBase64(this.value).encode()
        var result = hash + kitMinimize(base).encode(text64)
        return result;
    }

    async function fetchHasher(name) {
        if (this.ensign) return this.ensign;

        try {
            const response = await fetch('/api/hasher/' + name, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Không thể lấy ensign từ server');
            }

            const result = await response.json();

            if (result.success) {

                return result.data;
            }

            if (result.message) {
                return new Error(result.message)
            }
            return null;

        } catch (error) {
            console.error('Lỗi khi lấy ensign:', error);
            throw error;
        }
    }

    KitHasher.prototype.fetch = async function (name) {
        const hash = await fetchHasher(name);
        if (hash) { return this.encode(hash) }
        return
    }




    kitmodule.hasher = KitHasher;


})(typeof window !== "undefined" ? window : globalThis);

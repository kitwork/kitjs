(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});

    function KitMinimize(baseChars) {
        this.baseChars = baseChars
    }

    KitMinimize.prototype.encode = function (str) {
        const bytes = new TextEncoder().encode(str);
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const bigint = BigInt('0x' + hex);
        return this.fromBigInt(bigint);
    }

    KitMinimize.prototype.decode = function (str) {
        const bigint = this.toBigInt(str);
        let hex = bigint.toString(16);
        if (hex.length % 2 !== 0) { hex = '0' + hex; }
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.slice(i, i + 2), 16));
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
    }


    KitMinimize.prototype.toBigInt = function (input) {
        const baseChars = this.baseChars
        const base = BigInt(baseChars.length);
        let result = BigInt(0);
        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const index = baseChars.indexOf(char);
            if (index === -1) {
                throw new Error(`Invalid character '${char}'`);
            }
            result = result * base + BigInt(index);
        }
        return result;
    }

    KitMinimize.prototype.fromBigInt = function (bigint) {
        const baseChars = this.baseChars
        const base = BigInt(baseChars.length);
        if (bigint === BigInt(0)) return baseChars[0];
        let result = '';
        while (bigint > 0) {
            const mod = bigint % base;
            result = baseChars[Number(mod)] + result;
            bigint = bigint / base;
        }
        return result;
    }

    kitmodule.minimize = KitMinimize;


})(typeof window !== "undefined" ? window : globalThis);

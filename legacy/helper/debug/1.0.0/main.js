(function (global) {

    const kitmodule = global.kitmodule || (global.kitmodule = {});

    function isLocalhost() {
        if (kitmodule._isLocalHost === undefined) {
            const hostname = location.hostname;
            kitmodule._isLocalHost =
                ["localhost", "127.0.0.1", "::1"].includes(hostname) ||
                hostname.startsWith("127.");
        }
        return kitmodule._isLocalHost;
    }

    function kitDebug(isLocal = true) {
        if (isLocal) console.log(kitmodule)
    };


    kitmodule.debug = kitDebug
    kitmodule.isLocalhost = isLocalhost
    kitDebug(isLocalhost())

})(typeof window !== "undefined" ? window : globalThis);


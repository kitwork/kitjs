Kit.define("account", {
    identity: null,
    avatar: null,
    username: null,
    profile: null,
    first_name: null,
    last_name: null,
    name: null,
    tab: 'login',

    async initial() {
        this.keyStore = "account"
        try {
            var data = this.getStorage();
            if (data) {
                this.setInfomation(data)
                return
            }
            data = await this.fetchInformation();

            if (data) {
                sessionStorage.setItem(this.keyStore, JSON.stringify(data));
                this.setInfomation(data)
            }
            return
        } catch (e) {
            console.log(e)
            return null;
        }
    },

    getStorage() {
        let dataStorage = sessionStorage.getItem(this.keyStore);
        if (dataStorage) {
            try {
                return JSON.parse(dataStorage);
            } catch (e) {
                sessionStorage.removeItem(this.keyStore);
                return null;
            }
        }
    },
    async fetchInformation() {
        try {
            const response = await fetch('/api/account/information');
            const { success, data } = await response.json();
            if (success && data) { return data }
            return null;
        } catch (error) {
            return null;
        }
    },

    setInfomation(info) {
        Object.assign(this, info)
    },
    async logout(next) {
        // console.log(next)
        sessionStorage.removeItem(this.keyStore);
        this.setInfomation({ identity: null, avatar: null, username: null, profile: null, first_name: null, last_name: null })
        try {
            const response = await fetch('/api/logout', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                if (next) {
                    location.replace(next)
                }
                return
            }

            console.warn('Logout failed:', result.message || result);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
});

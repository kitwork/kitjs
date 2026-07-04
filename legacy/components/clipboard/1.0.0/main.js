Kit.define("clipboard", {
    text: '',
    copied: false,
    error: null,

    async copy(value, duration = 2468) {
        try {
            await navigator.clipboard.writeText(value);
            this.text = value;
            this.copied = true;
            this.error = null;
            setTimeout(() => this.copied = false, duration);
            return true; // để bên ngoài biết copy thành công
        } catch (err) {
            this.error = err.message || 'Copy failed';
            this.copied = false;
            return false; // để bên ngoài biết copy thất bại
        }
    }
});

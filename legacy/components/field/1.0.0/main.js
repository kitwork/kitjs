
Kit.define("field", {
    invalid: "",
    passwordShow: false,
    touched: false,
    readonly: false,
    validate(event) {
        // Nếu chưa touched mà là blur -> đánh dấu touched
        if (!this.touched && event.type === "blur") {
            this.touched = true;
        }
        // Nếu chưa touched (chưa blur) → không kiểm tra lỗi
        if (!this.touched) return;

        const element = event.target;
        if (!element) return;

        if (!element.checkValidity()) {
            const v = element.validity;
            let message = 'Trường này không hợp lệ.';

            switch (true) {
                case v.valueMissing:
                    message = 'Vui lòng nhập thông tin này.';
                    break;
                case v.typeMismatch:
                    message = 'Không hợp lệ.';
                    break;
                case v.tooShort:
                    message = `Tối thiểu ${element.minLength} ký tự.`;
                    break;
                case v.tooLong:
                    message = `Tối đa ${element.maxLength} ký tự.`;
                    break;
                case v.rangeUnderflow:
                    message = `Giá trị quá nhỏ. Tối thiểu là ${element.min}.`;
                    break;
                case v.rangeOverflow:
                    message = `Giá trị quá lớn. Tối đa là ${element.max}.`;
                    break;
                case v.stepMismatch:
                    message = `Giá trị không hợp lệ (không đúng bước step).`;
                    break;
                case v.patternMismatch:
                    message = element.title || 'Dữ liệu không đúng định dạng yêu cầu.';
                    break;
                case v.badInput:
                    message = `Dữ liệu không hợp lệ (ví dụ: nhập chữ vào trường số).`;
                    break;
                case v.customError:
                    message = element.validationMessage;
                    break;
            }

            this.invalid = message;
        } else {
            this.invalid = "";
        }
    }
})
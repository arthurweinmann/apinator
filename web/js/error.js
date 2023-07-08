class Err {
    /**
     * 
     * @param {string} code 
     * @param {string} message 
     */
    constructor(code, message) {
        AssertTypeOf(code, 'string');
        AssertTypeOf(message, 'string');

        this.Code = code;
        this.Message = message;
    }

    /**
     * 
     * @return {string}
     */
    toString() {
        return "Error(" + this.Code + "): " + this.Message;
    }
}
const {LANGUAGE_STATUS} = require('@src/constants')

const LANGUAGES = [
    {
        name: "English",
        code: "en",
        isRTL: false,
        locale: "en-US",
        status: LANGUAGE_STATUS.ACTIVE,
        deleted_at: null,
    },
    {
        name: "Arabic",
        code: "ar",
        isRTL: true,
        locale: "ar-SA",
        status: LANGUAGE_STATUS.ACTIVE,
        deleted_at: null,
    }
];

module.exports = {
    LANGUAGES
}


const RESPONSE_ACTION = {
    ACCOUNT_DELETED: 'accountDelete',
    PROFILE_UPDATED: 'profileUpdate',
    NFT_MINTED: 'nftMint',
    TICKET_CREATED_SUCCESSFULLY: 'ticketCreatedSuccessfully',
    COULD_NOT_CREATE_QRCODE: 'couldNotCreateQrcode',
    COULD_NOT_CREATE_FOODICS_RECORD: 'couldNotCreateFoodicsRecord',
    QRCODE_FOR_REDEEM_POINTS: 'qrcodeForRedeemPoints',
    YOUR_FEEDBACK_HAS_BEEN_SUBMITTED: 'yourFeedbackHasBeenSubmitted',
    DEFAULT_LANGUAGE_UPDATED: 'defaultLanguageUpdated',
    OTP_EXPIRED_OR_INVALID: 'otpExpiredOrInvalid',
    SELECT_LANGUAGE_TO_UPDATE: 'selectLanguageToUpdate',
    COULD_NOT_CREATED_TICKET: 'couldNotCreateTicket'

}
const ARABIC_RESPONSES = {
    CUSTOMER_DELETED: 'تم حذف العميل',
    PROFILE_UPDATED: 'تم تحديث الملف الشخصي',
    NFT_MINTED: 'تم سك NFT',
    TICKET_CREATED_SUCCESSFULLY: 'تم إنشاء التذكرة بنجاح',
    COULD_NOT_CREATE_QRCODE: 'لا يمكن إنشاء رمز الاستجابة السريعة',
    COULD_NOT_CREATE_FOODICS_RECORD: 'لا يمكن إنشاء سجل Foodics',
    QRCODE_FOR_REDEEM_POINTS: 'QRcode لاستبدال النقاط',
    YOUR_FEEDBACK_HAS_BEEN_SUBMITTED: 'تم إرسال ملاحظاتك',
    DEFAULT_LANGUAGE_UPDATED: 'تم تحديث اللغات الافتراضية',
    OTP_EXPIRED_OR_INVALID: 'OTP منتهي الصلاحية أو غير صالح',
    SELECT_LANGUAGE_TO_UPDATE: 'حدد اللغة للتحديث',
    COULD_NOT_CREATED_TICKET: 'لا يمكن إنشاء تذكرة'
}

module.exports = {
    RESPONSE_ACTION,
    ARABIC_RESPONSES
}
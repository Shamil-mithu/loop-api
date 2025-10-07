const otp = require('otp-generator')
const { NODE_ENV } = require('@src/config')

function otpGenerator() {
    let OTP;
    //if (NODE_ENV == 'development')
    //  OTP = 123456
    //else
        OTP = otp.generate(6, { upperCaseAlphabets: false, specialChars: false, digits: true, lowerCaseAlphabets: false });
    return OTP;
}

module.exports = {
    otpGenerator
}
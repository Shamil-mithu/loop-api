const { MAIL } = require('../config')

async function sendEmailVerificationOTP(email, OTP) {
    const mailOptions = {
        from: 'info@mithu.app',//`<no-reply>@mithu.app`,
        to: 'info@mithu.com',//email,
        subject: 'Email Verification OTP',
        text: `your otp is ${OTP}`
    }
    MAIL.transport.sendMail()

    MAIL.transport.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error)
        } else {
            console.log(`email send: ${info.response}`)
        }
    }
    )
}

module.exports = {
    sendEmailVerificationOTP
}
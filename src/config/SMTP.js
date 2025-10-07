const {createTransport} = require('nodemailer')
const SMTP_USERNAME = process.env.SMTP_USERNAME
const SMTP_PASSWORD = process.env.SMTP_PASSWORD

const transport = createTransport({
    host: 'email-smtp.us-east-1.amazonaws.com',
    port : 2587,
    auth :{
        user : SMTP_USERNAME,
        pass : SMTP_PASSWORD
    },
})

module.exports = {
    transport
}
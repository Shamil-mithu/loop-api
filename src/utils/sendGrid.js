const sgMail = require('@sendgrid/mail')
const { SENDGRID_API_KEY } = require('@src/config')
const { loginTemplate, emailVerificationTemplate, passwordResetConfirmation, registrationTemplate } = require('../mail-templates')
sgMail.setApiKey(SENDGRID_API_KEY)

async function SendLoginEmail(customer) {
  try {

    const currentTime = (new Date().toUTCString())
    const htmlContent = loginTemplate.template(currentTime);
    const msg = {
      to: customer.email,
      from: process.env.MAIL_FROM_ADDRESS, //"shamil.officefield@gmail.com",
      subject: 'You logged into your Account',
      text: 'You logged into your Account',
      html: htmlContent,
    }
    await sendMail(msg);
    console.log('Login mail sent successfully!');
    return true;
  } catch (error) {
    console.log('Error sending mail:', error);
    return error; // Return the error object
  }
}

async function sendEmailVerificationOtp(email,OTP) {
  try {
    const htmlContent = emailVerificationTemplate.template(OTP);
    const msg = {
      to: email,
      from: process.env.MAIL_SENDER_ADDRESS , 
      subject: 'OTP For Email Verification ',
      text: 'OTP For Email Verification',
      html: htmlContent,
    }
    await sendMail(msg);
    console.log('Email verification OTP sent successfully!');
    return true;
  } catch (error) {
    console.log('Error sending mail:', error);
    return error;
  }
}


async function SendRegistrationEmail(customer) {
  try {

    const currentTime = (new Date().toUTCString())
    const htmlContent = registrationTemplate.template(currentTime);
    const msg = {
      to: customer.email,
      from: process.env.MAIL_FROM_ADDRESS, //"shamil.officefield@gmail.com",
      subject: 'Registration',
      text: 'Thank you for registering with us',
      html: htmlContent,
    }
    await sendMail(msg);
    console.log('Registration mail sent successfully!');
    return true;
  } catch (error) {
    console.log('Error sending mail:', error);
    return error; // Return the error object
  }
}
async function SendForgotPasswordOtpEmail(customer, OTP) {
  try {
    const htmlContent = forgotPasswordTemplate.template(OTP);
    const msg = {
      to: customer.email,
      from: process.env.MAIL_FROM_ADDRESS, //"shamil.officefield@gmail.com",
      subject: 'OTP For your Account',
      text: 'OTP For your Account',
      html: htmlContent,
    }
    await sendMail(msg);
    console.log('Reset Password OTP sent successfully!');
    return true;
  } catch (error) {
    console.log('Error sending mail:', error);
    return error; // Return the error object
  }
}

async function passwordResetConfirmationMail(customer) {
  try {

    const htmlContent = passwordResetConfirmation.template();
    const msg = {
      to: customer.email,
      from: process.env.MAIL_FROM_ADDRESS, //"shamil.officefield@gmail.com",
      subject: 'Password Reset Confirmation',
      text: 'Password Reset Confirmation',
      html: htmlContent,
    }
    await sendMail(msg);
    return true;
  } catch (error) {
    console.log('Error sending mail:', error);
    return error; // Return the error object
  }
}

async function sendMail(msg) {
  try {
    await sgMail.send(msg);

  } catch (error) {
    throw error;
  }
}

module.exports = {
  SendLoginEmail,
  SendForgotPasswordOtpEmail,
  passwordResetConfirmationMail,
  SendRegistrationEmail,
  sendEmailVerificationOtp
}
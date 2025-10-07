"use strict"

const bcrypt = require("bcrypt");
const { otpGenerator } = require('./otp-generator')
const prisma = require('../../prisma/prisma-client')
const { sendGridMail } = require('../utils')

async function requestResetPasswordOTP(email) {
    try {
        const customer = await prisma.users.findUnique({
            where: {
                email: email
            },
        })

        if (!customer) {
            throw new Error("Customer does not exist")
        }
        
        let OTP = await prisma.reset_password.findUnique({
            where: {
                user_id: customer.id,
                is_expired: false
            }
        })
        if (OTP) {
            await prisma.reset_password.delete({
                where: {
                    user_id: customer.id,
                    is_expired: false
                }
            })
        }

        OTP = otpGenerator();
        const saltRounds = parseInt(process.env.SALT);
        const salt = bcrypt.genSaltSync(saltRounds);
        const hash = await bcrypt.hash(OTP, salt)

        const userOTP = await prisma.reset_password.create({
            data: {
                user_id: customer.id,
                otp: hash,
                created_at: new Date()

            }
        })

        if (!userOTP) {
            throw new Error('OTP creation Failed')
        }
        const result = await sendGridMail.SendForgotPasswordOtpEmail(customer, OTP)
        if (result !== true) {
            console.log('Error sending email');
            throw new Error("Internal Server Error")
        }

        return customer
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error handling
            throw new Error('Duplicate key error. Customer may have already requested a password reset.')
        } else {
            console.log(error)
            throw new Error(error.message)
        }
    }
}

// -----------------------------------------EXPORTS--------------------------------------------

module.exports = requestResetPasswordOTP
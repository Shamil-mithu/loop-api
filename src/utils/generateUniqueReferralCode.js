"use strict";

const { ReferralCode } = require('@src/models');

async function generateReferralCode() {
    const alphabets = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';

    let referralCode = '';
    for (let i = 0; i < 4; i++) {
        referralCode += alphabets.charAt(Math.floor(Math.random() * alphabets.length));
    }
    for (let i = 0; i < 2; i++) {
        referralCode += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return referralCode;
}

async function generateUniqueReferralCode() {
    let referralCode, codes;
    do {
        referralCode = await generateReferralCode();
        const existingCodes = await ReferralCode.find().select({ code: 1 });
        codes = existingCodes.map(code => code.code);
    } while (codes.includes(referralCode));
    return referralCode;
}

module.exports = generateUniqueReferralCode;
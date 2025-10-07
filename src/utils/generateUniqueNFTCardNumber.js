"use strict";

const { MembershipClaim } = require('@src/models');

async function generateNftNumber(name) {
    const digits = '0123456789';
    let loyaltyCardNumber
    let twoWordedName = name.split(' ')
    if (twoWordedName[0] && twoWordedName[1]) {
        loyaltyCardNumber = twoWordedName[0][0]
        loyaltyCardNumber += twoWordedName[1][0]
    } else {
        loyaltyCardNumber = name.substring(0, 2).toUpperCase();
    }

    for (let i = 0; i < 6; i++) {
        loyaltyCardNumber += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return loyaltyCardNumber;
}

async function generateUniqueNftCardNumber(name) {
    let loyaltyCardNumber, cardNumbers;
    do {
        loyaltyCardNumber = await generateNftNumber(name);
        const existingCardNumbers = await MembershipClaim.find({
            card_number: loyaltyCardNumber
        }).select({ card_number: 1 });
        cardNumbers = existingCardNumbers.map(card => card.card_number);
    } while (cardNumbers.includes(loyaltyCardNumber));
    return loyaltyCardNumber;
}

module.exports = generateUniqueNftCardNumber;

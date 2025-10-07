"use strict";

const {
  Models: { VendorCustomerSession },
} = require("@mithu/models-constants");

async function generateRequestedNumber() {
  const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";

  let orderNumber = "";
  for (let i = 0; i < 3; i++) {
    orderNumber += alphabets.charAt(
      Math.floor(Math.random() * alphabets.length)
    );
  }
  for (let i = 0; i < 4; i++) {
    orderNumber += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return orderNumber;
}

async function generateUniqueSessionRequestedNumber() {
  let sessionRequestedNumber, temp_requested_numbers;
  do {
    sessionRequestedNumber = await generateRequestedNumber();
    const existingRequestedNumbers = await VendorCustomerSession.find().select({ requested_number: 1 });
    temp_requested_numbers = existingRequestedNumbers.map(
      (vendorSession) => vendorSession.requested_number
    );
  } while (temp_requested_numbers.includes(sessionRequestedNumber));
  return sessionRequestedNumber;
}

module.exports = generateUniqueSessionRequestedNumber;

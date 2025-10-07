"use strict";

const {
  Models: { ManualReceipt },
} = require("@mithu/models-constants");

async function generateManualReceiptNumber() {
  const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";

  let orderNumber = "";
  for (let i = 0; i < 4; i++) {
    orderNumber += alphabets.charAt(
      Math.floor(Math.random() * alphabets.length)
    );
  }
  for (let i = 0; i < 3; i++) {
    orderNumber += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return orderNumber;
}

async function generateUniqueManualReceiptNumber() {
  let manualReceiptNumber, temp_manualReceipt_numbers;
  do {
    manualReceiptNumber = await generateManualReceiptNumber();
    const existingNumbers = await ManualReceipt.find().select({ unique_number: 1 });
    temp_manualReceipt_numbers = existingNumbers.map(
      (manual_receipt) => manual_receipt.unique_number
    );
  } while (temp_manualReceipt_numbers.includes(manualReceiptNumber));
  return manualReceiptNumber;
}

module.exports = generateUniqueManualReceiptNumber;

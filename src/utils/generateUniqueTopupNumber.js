"use strict";

const {
  Models: { Topup },
} = require("@mithu/models-constants");

async function generateTopupNumber() {
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

async function generateUniqueTopupNumber() {
  let topupNumber, temp_topup_numbers;
  do {
    topupNumber = await generateTopupNumber();
    const existingNumbers = await Topup.find().select({ topup_number: 1 });
    temp_topup_numbers = existingNumbers.map(
      (order_num) => order_num.topup_number
    );
  } while (temp_topup_numbers.includes(topupNumber));
  return topupNumber;
}

module.exports = generateUniqueTopupNumber;

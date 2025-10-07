"use strict";

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

async function generateUniqueDocumentNumber(unique_property, Model) {
  if (!Model?.find || !unique_property) {
    throw new Error(
      "unique property name and Mondo db collection model parameter required"
    );
  }

  let topupNumber, temp_topup_numbers;
  do {
    topupNumber = await generateTopupNumber();
    const existingNumbers = await Model.find().select({ [unique_property]: 1 });
    temp_topup_numbers = existingNumbers.map(
      (order_num) => order_num[unique_property]
    );
  } while (temp_topup_numbers.includes(topupNumber));
  return topupNumber;
}

module.exports = generateUniqueDocumentNumber;

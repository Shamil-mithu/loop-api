"use strict";

const {
    Models: { AppleWalletPass, GoogleWalletPass },
} = require("@mithu/models-constants");

async function generateSerialNumber() {
    const serialNumber = `SN${Math.floor(100000 + Math.random() * 900000)}`;
    return serialNumber;
}

async function generateUniqueWalletPassSerialNumber() {
    let serialNumber, appleSerials, googleSerials;
    do {
        serialNumber = await generateSerialNumber();

        const [applePasses, googlePasses] = await Promise.all([
            AppleWalletPass.find().select({ serial_number: 1 }),
            GoogleWalletPass.find().select({ serial_number: 1 }),
        ]);

        appleSerials = new Set(applePasses.map((p) => p.serial_number));
        googleSerials = new Set(googlePasses.map((p) => p.serial_number));
    } while (appleSerials.has(serialNumber) || googleSerials.has(serialNumber));

    return serialNumber;
}

module.exports = generateUniqueWalletPassSerialNumber;

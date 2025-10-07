"use strict";

function formatMerchantCode(merchantCode) {
    // Remove any non-digit characters
    const digitsOnly = merchantCode.replace(/\D/g, '');

    // Insert space every 4 characters
    const formattedCode = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ');

    return formattedCode;
}

module.exports = formatMerchantCode;
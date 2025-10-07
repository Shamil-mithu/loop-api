const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const generateUniqueWalletPassSerialNumber = require('./generateUniqueWalletPassSerialNumber');
const { APPLE_WALLET_WEBSERVICE_URL, APPLE_PASS_TYPE_IDENTIFIER, APPLE_ORGANIZATION_NAME, APPLE_TEAM_IDENTIFIER, APPLE_NFC_PUBLIC_KEY } = require('@src/config');

async function create(customer, existingPass = null) {
    const nfcPublicKey = APPLE_NFC_PUBLIC_KEY
    const serialNumber = existingPass?.serial_number ?? await generateUniqueWalletPassSerialNumber();
    const memberSince = customer.created_at
        ? new Date(customer.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
        : '01/01/2023';
    const authToken = existingPass?.authentication_token ?? crypto.randomBytes(16).toString('hex');

    const passJson = {
        description: "Mithu Loyalty Card",
        formatVersion: 1,
        organizationName: APPLE_ORGANIZATION_NAME,
        passTypeIdentifier: existingPass?.pass_type_identifier ?? APPLE_PASS_TYPE_IDENTIFIER,
        serialNumber: serialNumber,
        teamIdentifier: existingPass?.team_identifier ?? APPLE_TEAM_IDENTIFIER,
        webServiceURL: existingPass?.webservice_url ?? APPLE_WALLET_WEBSERVICE_URL,
        backgroundColor: "rgb(255, 255, 255)",
        authenticationToken: authToken,
        labelColor: "rgb(0, 0, 0)",
        foregroundColor: "rgb(0, 0, 0)",
        nfc: {
            message: serialNumber,
            encryptionPublicKey: nfcPublicKey
        },
        "maxDistance": 200,
        "locations": [
            {
                "latitude": 24.93183,
                "longitude": 67.06154,
                "relevantText": "Welcome to Shamil's House"
            },
            {
                "latitude": 24.930846,
                "longitude": 67.201493,
                "relevantText": "Don't forget to use Mithu Pass at 4Dots"
            },
            {
                "latitude": 24.854830,
                "longitude": 67.025596,
                "relevantText": "Jab Office aa hi gaye hain tw thora kaam hojae !"
            }
        ],
        storeCard: {
            headerFields: [
                {
                    key: "points_to_cash",
                    label: "Coins Cash",
                    value: `${customer.default_currency_symbol} ${customer?.points_to_cash}` ?? `${customer?.default_currency_symbol ?? "SAR"} 0`,
                    changeMessage: "Cash Price Changed !!"
                }
            ],
            primaryFields: [
                {
                    key: "points",
                    label: "Mithu Coins",
                    value: customer?.points?.toString() ?? '0',
                    changeMessage: "Wallet Points Changed !! "
                }
            ],
            secondaryFields: [
                {
                    key: "memberName",
                    label: "NAME",
                    value: customer?.name ?? 'Unknown',
                    changeMessage: "Your name changed to %@!"
                },
                {
                    key: "memberSince",
                    label: "MEMBER SINCE",
                    value: memberSince
                }
            ],
            auxiliaryFields: [
                {
                    key: "orderCount",
                    label: "Orders",
                    value: customer?.orderCount?.toString() ?? '0',
                    changeMessage: "wohoo! An Order added up to your wallet."
                }
            ],
            backFields: [
                {
                    key: "rewardBoost",
                    label: "",
                    value: customer?.rewardBoost ?? '2.5x rewards activated for 2 days',
                    attributedMessage: customer?.rewardBoost ?? '2.5x rewards activated for 2 days',
                    attributedKey: "Reward Boost"
                }
            ],
            relevantText: existingPass?.relevantText,
            relevantDate: existingPass?.relevantDate,
        },

    };

    const dir = path.join('passModel/custom.pass');

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, 'pass.json');
    fs.writeFileSync(filePath, JSON.stringify(passJson, null, 2), 'utf8');
    console.log(`✅ pass.json created at: ${filePath}`);
    return passJson
}

module.exports = create;
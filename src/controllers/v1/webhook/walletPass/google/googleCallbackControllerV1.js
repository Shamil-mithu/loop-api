const crypto = require("crypto");
const base64url = require("base64url");
const bodyParser = require("body-parser");
const { GoogleWalletPass } = require("@src/models");
const { response, insertMessageLog } = require("@src/utils");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { GCP_APPLICATION_CREDENTIALS, GCP_ISSUER_ID, GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK } = require('@src/config');

/**
 * Verifies the signature using EC P-256 public key.
 */
function verifySignature({ signedMessage, signature, publicKeyPem }) {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(signedMessage);
    verifier.end();

    const signatureBuffer = Buffer.from(signature, "base64");

    return verifier.verify(publicKeyPem, signatureBuffer);
}

/**
 * Converts Google's base64-encoded DER public key to PEM format.
 */
function convertDerKeyToPem(derB64) {
    const der = Buffer.from(derB64, 'base64');
    const b64 = der.toString('base64');
    const pem = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    return pem;
}

const CONTROLLER = [
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    async function registerWalletPassV1Controller(req, res) {
        try {
            console.log("Google Wallet Callback Hit");
            console.log(req.body);

            const {
                signature,
                intermediateSigningKey,
                protocolVersion,
                signedMessage,
            } = req.body;

            const signedKey = JSON.parse(intermediateSigningKey.signedKey);
            const publicKeyPem = convertDerKeyToPem(signedKey.keyValue);

            const isVerified = verifySignature({
                signedMessage,
                signature,
                publicKeyPem
            });

            if (!isVerified) {
                console.warn("Google Wallet callback signature verification failed.");
                return res.status(400).send("Invalid signature");
            }

            // Now that it's verified, parse the message
            const parsedMessage = JSON.parse(signedMessage);
            const {
                classId,
                objectId,
                eventType,
                expTimeMillis,
                nonce
            } = parsedMessage;

            // You can now log or update DB using objectId & eventType
            console.log(`[${eventType.toUpperCase()}] Wallet event for objectId: ${objectId}`);

            // Example (optional): mark pass as deleted or registered
            const pass = await GoogleWalletPass.findOne({
                object_id: objectId
            });
            if (pass?.is_registered && eventType === "save") {
                return res.status(300).send("Pass already registered.");
            }
            if (eventType === "del" && pass?.is_deleted) {
                console.log(`Pass with object Id ${objectId} is already deleted.`);
                return res.status(300).send("Pass already deleted.");
            }

            if (pass) {
                if (eventType === "save") pass.is_registered = true;
                if (eventType === "del") pass.is_deleted = true;
                await pass.save();
            }

            return response.send(
                1,
                STATUS_CODE.OK,
                `Google wallet pass ${eventType === "save" ? "registered" : "deleted"} successfully`,
                null,
                res,
                null
            );

        } catch (error) {
            console.error("Callback handler error:", error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception in Google Wallet callback: ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                `/v1/webhook/google/callback`,
                HTTP_VERBS.POST,
                null
            );
            return response.send(
                0,
                STATUS_CODE.INTERNAL_SERVER_ERROR,
                "Failed to process Google Wallet callback",
                null,
                res,
                error
            );
        }
    },
];

module.exports = CONTROLLER;

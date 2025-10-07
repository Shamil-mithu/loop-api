"use strict";

const { StoreLoyalty, MembershipClaim, Notification, Language } = require("@src/models");
const { S3 } = require("@src/lib");
const { STATUS_CODE, ERROR, S3_ACL,
    S3_UPLOAD_FOLDER, MINTING_STATUS, COLLECTION, NOTIFICATION_STATUS, NOTIFICATION_TYPES, NOTIFICATION_DESCRIPTION_ARABIC, NOTIFICATION_TITLE_ARABIC } = require("@src/constants");
const { response, generateUniqueNFTCardNumber } = require('@src/utils');
const { v4: uuidV4 } = require("uuid");
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const svg2img = require('svg2img');
const { S3_ENDPOINT, S3_CDN_URL, S3_BUCKET } = require("@src/config");

const fontPath = path.join(__dirname, '../../public/assets/fonts');

registerFont(path.join(fontPath, 'manrope-bold.otf'), { family: 'ManropeBold' });
registerFont(path.join(fontPath, 'manrope-extrabold.otf'), { family: 'ManropeExtraBold' });
registerFont(path.join(fontPath, 'manrope-semibold.otf'), { family: 'ManropeSemiBold' });
registerFont(path.join(fontPath, 'manrope-light.otf'), { family: 'ManropeLight' });
registerFont(path.join(fontPath, 'manrope-medium.otf'), { family: 'ManropeMedium' });
registerFont(path.join(fontPath, 'manrope-regular.otf'), { family: 'ManropeRegular' });
registerFont(path.join(fontPath, 'manrope-thin.otf'), { family: 'ManropeThin' });


async function claimMembershipForAUser(customer, storeLoyalty_id, type = 'not-backend') {
    try {
        const isStore = await (await StoreLoyalty.findById(storeLoyalty_id)).populate('merchant_id', 'name')
        const default_language = await Language.findOne({
            code: 'en'
        })
        if (!isStore) {
            return response.send(0, STATUS_CODE.NOT_FOUND, 'no loyalty card with provided IDs', null, res, ERROR.NOT_FOUND);
        }

        const card_number = await generateUniqueNFTCardNumber(isStore.merchant_id.name)

        // Load the background image
        const backgroundImage = await loadImage(isStore.background_image);
        const canvas = createCanvas(1372, 732);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `${isStore?.color_code}` ?? '#FFFFFF';

        // Draw the background image
        ctx.drawImage(backgroundImage, 0, 0, 1372, 732);
        // Set text properties and draw text
        ctx.font = '46px ManropeBold';
        ctx.fillText(isStore.title, 63, 100);

        ctx.font = '40px ManropeRegular';
        ctx.fillText(isStore.sub_title, 65, 155);

        ctx.font = '40px ManropeBold';
        let name = '';
        if (customer?.name) {
            name = customer.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
        }
        ctx.fillText(name, 65, 528);

        const currentDate = new Date();
        const day = String(currentDate.getDate()).padStart(2, '0');
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        const formattedDate = `${day}.${month}.${year}`;

        ctx.font = '40px ManropeMedium';
        ctx.fillText(`Mint:  ${formattedDate}`, 65, 592);

        ctx.font = '40px ManropeMedium';
        ctx.fillText(card_number, 117, 655);

        let buffer2
        const svgData = `<svg width="50" height="50" viewBox="0 0 137 119" fill="${isStore.color_code}" xmlns="http://www.w3.org/2000/svg"> <path d="M30.1596 43.4067C40.6868 43.4067 49.2208 34.8727 49.2208 24.3455C49.2208 13.8183 40.6868 5.2843 30.1596 5.2843C19.6324 5.2843 11.0984 13.8183 11.0984 24.3455C11.0984 34.8727 19.6324 43.4067 30.1596 43.4067Z"   fill="${isStore.color_code}" /> <path   d="M0.907471 118.708V93.23C29.5936 93.23 51.297 84.9261 65.4513 68.3183C77.1522 54.5414 83.7576 35.4802 85.0787 11.3235C84.8899 5.47301 85.2674 1.13235 85.4561 0L110.745 1.32107C110.745 4.71812 110.745 7.92644 110.556 11.1348C110.934 19.2499 112.821 30.1959 118.86 36.8013C122.824 41.3307 128.674 43.4067 136.412 43.4067H136.6V68.6958H136.412C122.446 68.6958 110.556 64.1664 101.686 55.485C97.5345 66.4311 91.8728 76.056 84.7012 84.5486C65.4513 107.196 37.3313 118.708 0.907471 118.708Z" fill="${isStore.color_code}"/></svg>`
        svg2img(svgData, async function (error, buffer) {
            buffer2 = buffer
        });
        const logoImg = await loadImage(buffer2);
        ctx.drawImage(logoImg, 65, 620, 40, 40)

        let attachmentUrl;
        const buffer = canvas.toBuffer('image/png')

        if (buffer) {
            const folder = S3_UPLOAD_FOLDER.MEMBERSHIP_CLAIM;
            const metadata = { customer: customer.id };

            const transformedBuffer = await S3.prepareForS3Upload(buffer);
            const filePath = await S3.upload(
                `${folder}/${customer.id}`,
                'png',//fileExtension,
                'image/png',//mimeType,
                transformedBuffer,
                S3_ACL.PUBLIC,
                metadata
            );
            attachmentUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
        }
        if (attachmentUrl.length < 1) {
            return response.send(0, STATUS_CODE.INTERNAL_SERVER_ERROR, 'could not create NFT', null, res, ERROR.INTERNAL_SERVER_ERROR);
        }

        const uuid = uuidV4()

        const newMembership = await MembershipClaim.create({
            customer_id: customer._id,
            nft_id: '', //mintNFT.id,
            merchant_id: isStore.merchant_id.id,
            storeLoyalty_id: isStore.id,
            contract_address: '', //mintNFT.contract_address,
            fee: 0, //mintNFT.fee,
            minted_address: '', //mintNFT.minted_address,
            name: '', //mintNFT.name,
            owner_address: '', //mintNFT.owner_address,
            symbol: uuid,
            token_uri: attachmentUrl, //mintNFT.token_uri,
            tx_ids: [], //mintNFT.tx_ids,
            card_number: card_number,
            status: type === 'backend' ? MINTING_STATUS.PENDING : MINTING_STATUS.PENDING_VERIFICATION,
            scheduled_time: null,

        })
        if (!newMembership) {
            return response.send(0, STATUS_CODE.INTERNAL_SERVER_ERROR, 'error while creating membership ', null, res, ERROR.INTERNAL_SERVER_ERROR);
        }
        const notification = await Notification.create({
            customer_id: customer.id,
            title: customer.default_language != default_language.id
                ? NOTIFICATION_TITLE_ARABIC.MEMBERSHIP_CARD_MINTING
                : 'Membership card minting',
            description: customer.default_language != default_language.id
                ? NOTIFICATION_DESCRIPTION_ARABIC.MEMBERSHIP_CARD_PROGRESS(isStore.merchant_id.name)
                : `Your membership card for ${isStore.merchant_id.name} is in progress.`,
            type: NOTIFICATION_TYPES.INDIVIDUAL,
            status: NOTIFICATION_STATUS.UNREAD,
            entity_id: newMembership.id,
            entity_type: COLLECTION.MEMBERSHIP_CLAIM
        });
        if (!notification) {
            console.error('could not create notification')
            return response.send(0, STATUS_CODE.INTERNAL_SERVER_ERROR, 'error while sending notification ', null, res, ERROR.INTERNAL_SERVER_ERROR);
        }
        return attachmentUrl

    } catch (error) {
        console.log(error);
        throw new Error(error.message ?? error)
    }
}

module.exports = claimMembershipForAUser 
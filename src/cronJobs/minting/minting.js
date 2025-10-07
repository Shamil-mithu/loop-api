"use strict";

const { MembershipClaim, StoreLoyalty, Notification, Language } = require("@root/src/models");
const cron = require("node-cron");
const { MINTING_STATUS, NOTIFICATION_STATUS, NOTIFICATION_TYPES, COLLECTION, NOTIFICATION_DESCRIPTION_ARABIC, NOTIFICATION_TITLE_ARABIC } = require('@src/constants');
const { AdaverseNFT } = require("@src/lib");
const { firebase } = require('@src/utils')


const cronSchedule = "*/3 * * * * *";
cron.schedule(cronSchedule, async () => {
    try {
        const now = new Date();
        const fifteenSecondsAgo = new Date(now.getTime() - 15000);
        const fifteenSecondsAhead = new Date(now.getTime() + 15000);
        const default_language = await Language.findOne({ code: 'en' })


        const scheduledMembershipClaim = await MembershipClaim.findOne({
            status: MINTING_STATUS.SCHEDULED,
            scheduled_time: { $gte: fifteenSecondsAgo, $lte: fifteenSecondsAhead }
        }).populate('customer_id merchant_id').limit(5);

        if (!scheduledMembershipClaim) {
            // console.log("No scheduled claim within current time range.");
            return;
        }
        // console.log(scheduledMembershipClaim)

        scheduledMembershipClaim.status = MINTING_STATUS.MINTING_STARTED;
        await scheduledMembershipClaim.save();

        const storeLoyalty = await StoreLoyalty.findById(scheduledMembershipClaim.storeLoyalty_id).populate('merchant_id');
        const attachmentUrl = scheduledMembershipClaim.token_uri;
        const name = storeLoyalty.name;
        const uuid = scheduledMembershipClaim.symbol;

        const mintNFT = await AdaverseNFT.mintNfts.mint(attachmentUrl, name, uuid);
        if (!mintNFT) {
            console.error("Could not create NFT");
            scheduledMembershipClaim.status = MINTING_STATUS.MINTING_FAILED;
            await scheduledMembershipClaim.save();
            return;
        }

        scheduledMembershipClaim.nft_id = mintNFT.id;
        scheduledMembershipClaim.merchant_id = storeLoyalty.merchant_id;
        scheduledMembershipClaim.storeLoyalty_id = storeLoyalty.id;
        scheduledMembershipClaim.contract_address = mintNFT.contract_address;
        scheduledMembershipClaim.fee = mintNFT.fee;
        scheduledMembershipClaim.minted_address = mintNFT.minted_address;
        scheduledMembershipClaim.name = mintNFT.name;
        scheduledMembershipClaim.owner_address = mintNFT.owner_address;
        scheduledMembershipClaim.tx_ids = mintNFT.tx_ids;
        scheduledMembershipClaim.status = MINTING_STATUS.MINTING_COMPLETED;

        await scheduledMembershipClaim.save();
        if (scheduledMembershipClaim?.customer_id?.device_token) {
            const message = scheduledMembershipClaim?.customer_id?.default_language != default_language.id ? NOTIFICATION_DESCRIPTION_ARABIC.MEMBERSHIP_CARD_MINTING_CREATION(storeLoyalty.merchant_id.name) : 'Your NFT membership card has been created'
            firebase.sendNotificationCustomer(scheduledMembershipClaim.customer_id.device_token, 'NFT Membership', message, scheduledMembershipClaim.token_uri)
        }
        const notification = await Notification.create({
            customer_id: scheduledMembershipClaim?.customer_id._id,
            title: scheduledMembershipClaim?.customer_id?.default_language != default_language.id
                ? NOTIFICATION_TITLE_ARABIC.MEMBERSHIP_CARD_MINTING
                : 'Membership card minting',
            description: scheduledMembershipClaim?.customer_id?.default_language != default_language.id
                ? NOTIFICATION_DESCRIPTION_ARABIC.MEMBERSHIP_CARD_MINTING_CREATION(storeLoyalty.merchant_id.name)
                : `Your NFT membership card for ${storeLoyalty.merchant_id.name} has been created.`,
            type: NOTIFICATION_TYPES.INDIVIDUAL,
            status: NOTIFICATION_STATUS.UNREAD,
            entity_id: scheduledMembershipClaim.id,
            entity_type: COLLECTION.MEMBERSHIP_CLAIM
        });

        if (!notification) {
            console.error('could not create notification')
            return response.send(0, STATUS_CODE.INTERNAL_SERVER_ERROR, 'error while sending notification ', null, res, ERROR.INTERNAL_SERVER_ERROR);
        }

        // console.log(`NFT minted successfully for membership claim ID: ${scheduledMembershipClaim._id}`);

    } catch (error) {
        // console.error(error);
        throw new Error(error)
    }
});

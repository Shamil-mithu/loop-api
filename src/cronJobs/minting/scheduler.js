"use strict";

const { MembershipClaim, Notification, Language } = require("@root/src/models");
const cron = require("node-cron");
const { MINTING_STATUS, NOTIFICATION_STATUS, NOTIFICATION_TYPES, COLLECTION, NOTIFICATION_DESCRIPTION_ARABIC, NOTIFICATION_TITLE_ARABIC } = require('@src/constants');
const { firebase, response } = require('@src/utils')


const cronSchedule = "*/20 * * * * *";
cron.schedule(cronSchedule, async () => {
    try {
        const now = new Date();
        const default_language = await Language.findOne({ code: 'en' })

        const pendingMembershipClaims = await MembershipClaim.find({
            status: MINTING_STATUS.PENDING
        }).sort({ created_at: 'asc' }).select('created_at scheduled_time status device_token').populate('customer_id merchant_id').limit(5);

        const LastScheduledMembershipClaim = await MembershipClaim.find({
            status: MINTING_STATUS.SCHEDULED,
        }).sort({ updated_at: 'desc' }).limit(1).select('scheduled_time device_token').populate('customer_id merchant_id');

        let lastScheduledTime = LastScheduledMembershipClaim[0]?.scheduled_time || now;
        if (lastScheduledTime < now) {
            lastScheduledTime = now;
        }

        for (const pendingMembershipClaim of pendingMembershipClaims) {
            lastScheduledTime = new Date(lastScheduledTime.getTime() + 30 * 1000);

            pendingMembershipClaim.scheduled_time = lastScheduledTime;
            pendingMembershipClaim.status = MINTING_STATUS.SCHEDULED;
            // if (pendingMembershipClaim?.customer_id?.device_token) {
            //     firebase.sendNotificationCustomer(pendingMembershipClaim.customer_id.device_token, 'NFT Membership', `Your NFT membership has been scheduled for ${lastScheduledTime}`)
            // }
            const notification = await Notification.create({
                customer_id: pendingMembershipClaim?.customer_id._id,
                title: pendingMembershipClaim?.customer_id?.default_language != default_language.id
                    ? NOTIFICATION_TITLE_ARABIC.MEMBERSHIP_CARD_MINTING
                    : 'Membership card minting',
                description: pendingMembershipClaim?.customer_id?.default_language != default_language.id
                    ? NOTIFICATION_DESCRIPTION_ARABIC.MEMBERSHIP_CARD_SCHEDULING(pendingMembershipClaim.merchant_id.name, lastScheduledTime)
                    : `Your membership card for ${pendingMembershipClaim.merchant_id.name} has been scheduled for ${lastScheduledTime}.`,
                type: NOTIFICATION_TYPES.INDIVIDUAL,
                status: NOTIFICATION_STATUS.UNREAD,
                entity_id: pendingMembershipClaim.id,
                entity_type: COLLECTION.MEMBERSHIP_CLAIM
            });

            // console.log('notification',notification)

            await pendingMembershipClaim.save();
        }

        const expiredScheduledClaims = await MembershipClaim.find({
            $or: [
                { status: MINTING_STATUS.SCHEDULED },
                { status: MINTING_STATUS.MINTING_STARTED },
            ],
            scheduled_time: { $lte: now }
        }).select('scheduled_time status').populate('customer_id merchant_id').limit(5);
        for (const claim of expiredScheduledClaims) {
            lastScheduledTime = new Date(lastScheduledTime.getTime() + 30 * 1000);

            claim.scheduled_time = lastScheduledTime
            claim.status = MINTING_STATUS.SCHEDULED;

            // if (claim?.customer_id?.device_token) {
            //     firebase.sendNotificationCustomer(claim.customer_id.device_token, 'NFT Membership', `Your NFT membership has been rescheduled for ${lastScheduledTime}`)
            // }

            let notification
            if (claim?.customer_id?._id) {
                notification = await Notification.create({
                    customer_id: claim?.customer_id._id,
                    title: claim?.customer_id?.default_language != default_language.id
                        ? NOTIFICATION_TITLE_ARABIC.MEMBERSHIP_CARD_MINTING
                        : 'Membership card minting',
                    description: claim?.customer_id?.default_language != default_language.id
                        ? NOTIFICATION_DESCRIPTION_ARABIC.MEMBERSHIP_CARD_RESHCEDULING(claim.merchant_id.name, lastScheduledTime)
                        : `Your NFT membership card for ${claim.merchant_id.name} has been rescheduled for ${lastScheduledTime}.`,
                    type: NOTIFICATION_TYPES.INDIVIDUAL,
                    status: NOTIFICATION_STATUS.UNREAD,
                    entity_id: claim.id,
                    entity_type: COLLECTION.MEMBERSHIP_CLAIM
                });
            }

            if (!notification) {
                console.error('could not create notification')
                // return response.send(0, STATUS_CODE.INTERNAL_SERVER_ERROR, 'error while sending notification ', null, res, ERROR.INTERNAL_SERVER_ERROR);
            }
            // console.log('notification',notification)

            await claim.save();
        }


        // console.log(`updated ${pendingMembershipClaims.length} pending and ${expiredScheduledClaims.length} expired claims.`);

    } catch (error) {
        console.error(error);
    }
});

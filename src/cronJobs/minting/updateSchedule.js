"use strict";

const { MembershipClaim } = require("@root/src/models");
const cron = require("node-cron");
const { MINTING_STATUS } = require('@src/constants');

const cronSchedule = "*/60 * * * * *";
cron.schedule(cronSchedule, async () => {
    try {
        //TODO
        /**
         * update schedule_time of those MembershipClaim where schedule_time has passed the current time and their status is still scheduled
         */ 
        
    } catch (error) {
        console.error(error);
        console.log("Error Exchange Rate.");
    }
});

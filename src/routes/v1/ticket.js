"use strict";

const {
    getAllTicketsV1,
    getAllTicketTypesV1,
    createTicketsV1,
    showTicketV1

} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllTicketsV1)

router.route('/:ticketId')
    .get(showTicketV1)

router.route('/create')
    .post(createTicketsV1)

router.route('/types/get-all')
    .get(getAllTicketTypesV1)




// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/ticket", router);
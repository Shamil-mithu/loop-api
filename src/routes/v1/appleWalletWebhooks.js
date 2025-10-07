"use strict";

const {
    registerAppleWalletPassV1Controller,
    unRegisterAppleWalletPassV1Controller,
    sendUpdatedWalletPassV1Controller,
    sendListOfUpdatableWalletPassesV1Controller
} = require("@src/controllers");

const { Router } = require("express");

const mainRouter = Router();
const devicesRouter = Router();
const passesRouter = Router();

// Apple Wallet Pass Routes

// /v1/devices/...
devicesRouter.route('/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
    .post(registerAppleWalletPassV1Controller)
    .delete(unRegisterAppleWalletPassV1Controller);

devicesRouter.route('/:deviceLibraryIdentifier/registrations/:passTypeIdentifier')
    .get(sendListOfUpdatableWalletPassesV1Controller);

// /v1/passes/...
passesRouter.route('/:passTypeIdentifier/:serialNumber')
    .get(sendUpdatedWalletPassV1Controller);

// Attach to main router
mainRouter.use("/devices", devicesRouter);
mainRouter.use("/passes", passesRouter);

module.exports = mainRouter;

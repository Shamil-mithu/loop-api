"use strict";

const { SHARED_DB_URI } = require("./src/config");
const mongoose = require("mongoose");

mongoose
  .connect(
    SHARED_DB_URI,
  )
  .then(() => console.log("Shared DB connection established"))
  .catch(error => {
    console.error(error);

    process.exit(1);
  });

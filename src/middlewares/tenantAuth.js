"use strict";


// Note: Models in dedicated DBs must be registered per connection, not globally.
// So instead of mongoose.model, we’ll do req.dbConn.model.


const { TenantService } = require("@src/services");

async function tenantMiddleware() {
  return async function (req, res, next) {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) return res.status(400).json({ error: "Missing tenant-id" });

    // resolve connection
    req.dbConn = await TenantService.getTenantConnection(tenantId);
    req.tenantId = tenantId;

    next();
  }
}

module.exports = tenantMiddleware;
"use strict";


// Note: Models in dedicated DBs must be registered per connection, not globally.
// So instead of mongoose.model, we’ll do req.dbConn.model.


const { TenantService } = require("@src/services");

async function tenantMiddleware(req, res, next) {
  try {
    const tenantId = req.headers["x-tenant-id"];
    if (!tenantId) return res.status(400).json({ error: "Missing tenant-id" });

    // resolve connection
    req.dbConn = await TenantService.getTenantConnection(tenantId);
    req.tenantId = tenantId;

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err);
    res.status(500).json({ error: "Tenant resolution failed" });
  }
}

module.exports = tenantMiddleware;

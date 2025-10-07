"use strict";
const mongoose = require("mongoose");
const { Tenant } = require("@src/models");

// cache tenant configs + db connections
const tenantCache = new Map();

async function getTenant(tenantId) {
  if (tenantCache.has(tenantId)) {
    return tenantCache.get(tenantId).tenant;
  }

  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

  tenantCache.set(tenantId, { tenant, conn: null });
  return tenant;
}

async function getTenantConnection(tenantId) {
  const cached = tenantCache.get(tenantId);
  let tenant = cached ? cached.tenant : await getTenant(tenantId);

  // shared mode → use default mongoose connection
  if (tenant.db_mode === "shared") {
    return mongoose.connection;
  }

  // dedicated mode → create/reuse a connection
  if (tenant.db_mode === "dedicated") {
    if (cached && cached.conn) return cached.conn;

    const conn = await mongoose.createConnection(tenant.db_uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    tenantCache.set(tenantId, { tenant, conn });
    return conn;
  }

  throw new Error(`Unknown db_mode for tenant ${tenantId}`);
}

module.exports = { getTenant, getTenantConnection };

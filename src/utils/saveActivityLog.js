const { ActivityLog } = require("@src/models");

const saveActivityLog = async (
  entity_id,
  entity_name,
  old_doc,
  new_doc,
  action,
  updated_by
) => {
  try {
    const activityData = {
      entity_id,
      entity_name,
      old_doc,
      new_doc,
      action,
      updated_by,
    };
    await ActivityLog.create(activityData);
  } catch (error) {
    console.log(
      `ERROR storing activity log of ${entity_name}:` + error.message ?? error
    );
  }
};

module.exports = saveActivityLog;

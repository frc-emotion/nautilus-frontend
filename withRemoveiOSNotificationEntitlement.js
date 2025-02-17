const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = (config) => {

  withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });

  return config;
};
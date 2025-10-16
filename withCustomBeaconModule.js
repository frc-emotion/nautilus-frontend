const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function appendToPodfile(contents) {
  const customPod = `
  pod 'BeaconBroadcaster', :path => '/Users/mugilanrajaraman/Desktop/nautilius_5/nautilus-frontend/modules/BeaconBroadcaster/ios'
  `;

  // Avoid adding it multiple times
  if (contents.includes(customPod)) {
    return contents;
  }

  return contents.replace(
    /use_expo_modules!(.*?)\n/m,
    `use_expo_modules!$1\n${customPod}\n`
  );
}

const withCustomBeaconModule = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');

      // Update Podfile with the custom pod
      const updatedPodfile = appendToPodfile(podfile);

      fs.writeFileSync(podfilePath, updatedPodfile);
      return config;
    },
  ]);
};

module.exports = withCustomBeaconModule;
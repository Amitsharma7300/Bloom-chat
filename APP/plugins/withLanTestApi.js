const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLanTestApi(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = process.env.BLOOM_LAN_TEST_APK === '1' ? 'true' : 'false';
    }
    return modConfig;
  });
};

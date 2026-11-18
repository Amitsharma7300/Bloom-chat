const base = require('./app.json').expo;

const androidAppId = process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const iosAppId = process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
if (process.env.NODE_ENV === 'production' && (!process.env.ADMOB_ANDROID_APP_ID || !process.env.ADMOB_IOS_APP_ID)) {
  throw new Error('Set ADMOB_ANDROID_APP_ID and ADMOB_IOS_APP_ID for a production build');
}

module.exports = {
  ...base,
  plugins: base.plugins.map((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads'
    ? ['react-native-google-mobile-ads', { androidAppId, iosAppId }]
    : plugin),
};

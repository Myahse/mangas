module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be last — required for react-native-reanimated (used by expo-router / screens)
      'react-native-reanimated/plugin',
    ],
  };
};

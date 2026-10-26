module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo automatically injects react-native-worklets/plugin
    // when react-native-reanimated is installed, so no manual plugin entry.
    presets: ['babel-preset-expo'],
  };
};

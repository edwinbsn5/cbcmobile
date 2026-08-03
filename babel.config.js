module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Must stay last in the plugins list (reanimated's own requirement) —
    // used for the useAnimatedKeyboard()-based keyboard-avoidance fix in
    // ChatScreen.js/CommentsSheet.js.
    plugins: ["react-native-reanimated/plugin"],
  };
};

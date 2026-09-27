/**
 * Importing @expo/vector-icons for real pulls in expo-font -> expo-asset, which
 * Metro resolves on device but Jest cannot. Icons carry no behaviour worth
 * asserting, so every icon set renders as its name in a <Text>.
 */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const Icon = ({ name, ...rest }) => React.createElement(Text, rest, name);

  // A Proxy so any icon set (MaterialCommunityIcons, Ionicons, ...) resolves
  // without listing them one by one.
  return new Proxy(
    {},
    {
      get: (_target, property) => (property === '__esModule' ? true : Icon),
    }
  );
});

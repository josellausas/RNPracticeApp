import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Menu } from '../Menu';
import { MenuItem } from '../interfaces/interfaces';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

const menuItems: MenuItem[] = [
  {title: "Map", route: "map"},
  {title: "Settings", route: "settings"},
  {title: "Debug", route: "debug"},
  {title: "SW Characters", route: "charactersList"},
  {title: "Fetch Screen", route: "fscreen"},
  {title: "NFC Read", route: "nfcRead"},
];

export const MenuScreen = ({ navigation }: Props) => {
  const handleItemPress = (item: MenuItem) => {
    navigation.navigate(item.route);
  };

  return <Menu items={menuItems} onItemPress={handleItemPress} />;
}

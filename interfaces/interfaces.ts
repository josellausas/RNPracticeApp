export interface MenuItem {
  title: string
  route: 'map' | 'settings' | 'debug'
};

export interface Coordinate {
  latitude: number
  longitude: number
}

export interface Pin extends Coordinate {
  id: string
  title: string
}

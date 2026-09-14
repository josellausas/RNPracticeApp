import { MenuRoute } from '../navigation/types'

export interface MenuItem {
  title: string
  route: MenuRoute
};

export interface Coordinate {
  latitude: number
  longitude: number
}

export interface Pin extends Coordinate {
  id: string
  title: string
}

export interface Character {
  name: string
  birth_year: string
  gender: string
}

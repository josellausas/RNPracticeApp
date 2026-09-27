export type RootStackParamList = {
  Menu: undefined
  map: undefined
  settings: undefined
  debug: undefined
  pinList: undefined
  editPin: { pinId: string }
  charactersList: undefined
  fscreen: undefined
  characterProfile: { characterId: string }
  registerNfc: { characterId: string }
  nfcRead: undefined
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

/**
 * Routes reachable with no params — the only ones a plain menu entry can target.
 * Derived from RootStackParamList so adding a screen there widens this automatically.
 */
export type ParamlessRoute = {
  [K in keyof RootStackParamList]: RootStackParamList[K] extends undefined ? K : never
}[keyof RootStackParamList];

/** Destinations offered by the main menu (everything paramless except the menu itself). */
export type MenuRoute = Exclude<ParamlessRoute, 'Menu'>;

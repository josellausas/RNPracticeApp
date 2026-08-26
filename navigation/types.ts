export type RootStackParamList = {
  Menu: undefined
  map: undefined
  settings: undefined
  debug: undefined
  pinList: undefined
  editPin: { pinId: string }
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

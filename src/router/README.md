```typescript

function mapRoute(router) {
  router.use('profile', Profile);
  router.use('game/:type', Game);
}

function App() {
  return (
    <Portal mapRoute={mapRoute} default={Lobby} />
  );
}

function lobbyMapRoute(router) {
  router.use('single', SinglePlayerMenu);
  router.use('multi', MultiPlayerMenu);
}

function Lobby() {
  return (
    <Portal mapRoute={lobbyMapRoute} default={LobbyHome}>
  )
}

function shopMapRoute(router) {
  router.use('coin', Coin);
  router.use('diamond', Diamod);
}

function Shop() {
  return (
    <Portal mapRoute={shopMapRoute} default={Coin} />
  );
}

Shop.title = 'Shop';


```

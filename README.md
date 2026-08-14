# Shared Gallery Room

A multiplayer WebXR gallery: wall art, a looping film wall, a live whiteboard, avatars, and chat.

## Try it

1. Open the site and enter a room name.
2. Share the URL. Friends join the same room.
3. **Desktop:** WASD walk, right-drag look, click the board to draw, **T** to chat.
4. **VR:** open the same link in Meta Quest Browser (or another WebXR headset) and tap **Enter VR**. Left stick walks, right stick snap-turns, trigger paints the board.

## Stack

React + TanStack Start + Three.js / React Three Fiber / `@react-three/xr`. Multiplayer is a WebRTC mesh with a small signaling API.

## Local

```bash
npm install
npm run dev
```

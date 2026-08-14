export const PEN_COLORS = [
  { id: "black", label: "Ink", hex: "#18181b" },
  { id: "red", label: "Red", hex: "#c45c5c" },
  { id: "blue", label: "Blue", hex: "#5b7c99" },
  { id: "green", label: "Green", hex: "#6b8f71" },
  { id: "white", label: "White", hex: "#f4f4f5" },
  { id: "eraser", label: "Eraser", hex: "#e4e0d8" },
] as const;

export type PenColorId = (typeof PEN_COLORS)[number]["id"];

export type StrokePoint = [number, number];

export type ChatLine = {
  id: string;
  from: string;
  name: string;
  text: string;
  at: number;
};

export type NetMessage =
  | {
      t: "pose";
      x: number;
      y: number;
      z: number;
      yaw: number;
      name: string;
      color: string;
    }
  | {
      t: "stroke";
      id: string;
      color: string;
      width: number;
      erase: boolean;
      points: StrokePoint[];
      done?: boolean;
    }
  | { t: "clear" }
  | { t: "hello"; name: string; color: string }
  | {
      t: "sync";
      strokes: Array<{
        id: string;
        color: string;
        width: number;
        erase: boolean;
        points: StrokePoint[];
      }>;
    }
  | { t: "chat"; id: string; name: string; text: string };

export interface RemoteAvatar {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  updatedAt: number;
}

export const AVATAR_PALETTE = ["#8a9099", "#6b8f71", "#5b7c99", "#c45c5c", "#a89070", "#7a6b8f"];

export const ROOM = {
  width: 14,
  depth: 12,
  height: 3.6,
  wallThickness: 0.14,
} as const;

export const MEDIA = {
  images: [
    { id: "strata", src: "/media/art-strata.jpg", title: "Strata Form", credit: "North wall" },
    { id: "night", src: "/media/art-night.jpg", title: "Night Harbor", credit: "North wall" },
    { id: "canyon", src: "/media/art-canyon.jpg", title: "Canyon Archive", credit: "West wall" },
  ],
  video: { src: "/media/gallery-loop.mp4", title: "Sculpture Loop", credit: "East wall" },
  floor: "/media/floor-oak.jpg",
  wall: "/media/wall-plaster.jpg",
  runner: "/media/floor-slate.jpg",
} as const;

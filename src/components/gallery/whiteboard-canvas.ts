import type { StrokePoint } from "./types";

export const BOARD_W = 1024;
export const BOARD_H = 576;
export const BOARD_BG = "#e8e4dc";

export function createBoardCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_W;
  canvas.height = BOARD_H;
  const ctx = canvas.getContext("2d")!;
  clearBoard(ctx);
  return canvas;
}

export function clearBoard(ctx: CanvasRenderingContext2D) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  // subtle grid
  ctx.strokeStyle = "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  const step = 48;
  for (let x = step; x < BOARD_W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD_H);
    ctx.stroke();
  }
  for (let y = step; y < BOARD_H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD_W, y);
    ctx.stroke();
  }
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: StrokePoint[],
  color: string,
  width: number,
  erase: boolean,
) {
  if (points.length === 0) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  if (erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = width * 2.2;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
  }

  const toXY = (p: StrokePoint) => [p[0] * BOARD_W, p[1] * BOARD_H] as const;

  if (points.length === 1) {
    const [x, y] = toXY(points[0]);
    ctx.beginPath();
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = erase ? "rgba(0,0,0,1)" : color;
    if (erase) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
    } else {
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  ctx.beginPath();
  const [x0, y0] = toXY(points[0]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = toXY(points[i]);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

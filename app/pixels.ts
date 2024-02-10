import { kv } from "@vercel/kv";

const HEIGHT = 28;
const WIDTH = 54;

const pixelColor = (x: number, y: number) => `pixel:${x}:${y}`;
const pixelLastUpdated = (x: number, y: number) => `lastUpdated:${x}:${y}`;
const userLastWrite = (user: number) => `lastWrite:${user}`;

const allPixelKeys = Array.from({ length: HEIGHT }, (_, i) =>
  Array.from({ length: WIDTH }, (_, j) => pixelColor(i, j)),
).flat();

export type Pixels = string[][];

export async function getPixels(): Promise<Pixels> {
  const flatPixels = await kv.mget<string[]>(allPixelKeys);
  const pixels = Array.from({ length: HEIGHT }, (_, i) =>
    Array.from(
      { length: WIDTH },
      (_, j) => flatPixels[i * WIDTH + j] || "#ffffff",
    ),
  );
  return pixels;
}

export async function setPixel(user: number, x: number, y: number, color: string) {
  await kv.set(userLastWrite(user), Date.now().toString());
  await kv.set(pixelLastUpdated(x, y), Date.now().toString());
  await kv.set(pixelColor(x, y), color);
}

async function getTimestamp(key: string): Promise<number> {
  const timestamp = await kv.get<string>(key);
  if (timestamp === null) {
    return 0;
  } else {
    return parseInt(timestamp);
  }
}


export async function getUserLastWrite(user: number): Promise<number> {
  return getTimestamp(userLastWrite(user));
}

export async function getPxLastUpdated(x: number, y: number) {
  return getTimestamp(pixelLastUpdated(x, y));
}

/** 单字节转两位大写 hex。 */
export const byte2 = (n: number): string => (n & 0xff).toString(16).padStart(2, '0').toUpperCase();

/** 字节数组转空格分隔的 hex 串。 */
export const toHex = (arr: ArrayLike<number>): string => Array.from(arr, byte2).join(' ');

/** Promise 版 sleep。 */
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 把 0..1 的值夹到 [0,1]。 */
export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

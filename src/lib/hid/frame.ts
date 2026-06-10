import { CMD_FORCE_TRIGGER, FRAME_MAGIC } from './constants';
import { TRIGGER_MODES, type TriggerMode } from './triggers';

export interface TriggerFrameOptions {
  mode: TriggerMode;
  side: number;
  values: Record<string, number>;
  match: boolean;
  reportLen: number;
}

/**
 * 拼一帧扳机命令的 data（不含 reportId — WebHID 的 reportId 单独传给 sendReport）。
 * 帧格式：5A A5 | cmd=51(81) | len=0A | apply=01 | side mode p1 p2 p3 p4 …
 * 余下字节补 0 至 reportLen。
 */
export function buildTriggerFrame(opts: TriggerFrameOptions): Uint8Array<ArrayBuffer> {
  const def = TRIGGER_MODES[opts.mode];
  const createParams = def.build(opts.side, opts.values, opts.match ? 1 : 0);
  const frame = [...FRAME_MAGIC, CMD_FORCE_TRIGGER, 0x0a, 0x01, ...createParams];
  const len = Math.max(opts.reportLen, frame.length);
  const data = new Uint8Array(new ArrayBuffer(len));
  data.set(frame.slice(0, len), 0);
  return data;
}

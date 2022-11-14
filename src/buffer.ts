import { Buffer } from "node:buffer";

const SEGMENT_BITS = 0x7f;
const CONTINUE_BIT = 0x80;

export class ReadBuffer {
  private buffer: Buffer;
  private offset = 0;

  public constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  // https://wiki.vg/Protocol#Data_types

  public readByte(): number {
    this.offset++;
    return this.buffer.readInt8(this.offset - 1);
  }

  public readVarInt(): number {
    let value = 0;
    let position = 0;
    let currentByte;

    while (true) {
      currentByte = this.readByte();
      value |= (currentByte & SEGMENT_BITS) << position;

      if ((currentByte & CONTINUE_BIT) == 0) break;

      position += 7;

      if (position >= 32) throw new Error("VarInt is too big");
    }
    return value;
  }
  public readInt(): number {
    this.offset += 4;
    return this.buffer.readInt32BE(this.offset - 4);
  }

  public readShort(unsigned = false): number {
    this.offset += 2;
    if (unsigned) {
      return this.buffer.readUint16BE(this.offset - 2);
    }
    return this.buffer.readInt16BE(this.offset - 2);
  }
  public readLong(): bigint {
    this.offset += 8;
    return this.buffer.readBigInt64BE(this.offset - 8);
  }

  public readString(max?: number): string {
    // Every String is prefixed with a VarInt that indicates it's size.
    const size = this.readVarInt();
    if (size > (max ?? 32767)) throw new Error("size exceeds max size");
    return this.buffer.subarray(this.offset, (this.offset += size)).toString();
  }
  public toBuffer() {
    return this.buffer;
  }
}

export class WriteBuffer {
  private buffer: Buffer;

  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  public writeVarInt(value: number) {
    while (true) {
      if ((value & ~SEGMENT_BITS) == 0) {
        this.appendBuffer(value);
        return;
      }

      this.appendBuffer((value & SEGMENT_BITS) | CONTINUE_BIT);

      value >>>= 7;
    }
  }

  public writeString(value: string) {
    const buf = Buffer.from(value);
    if (buf.length > 32767) throw new Error("string size exceeds max size");
    this.writeVarInt(buf.length);
    this.buffer = Buffer.concat([this.buffer, buf]);
  }

  public appendBuffer(value: Buffer | number) {
    if (Buffer.isBuffer(value)) {
      this.buffer = Buffer.concat([this.buffer, value]);
      return;
    }
    this.buffer = Buffer.concat([this.buffer, Buffer.from([value])]);
  }

  public toBuffer(): Buffer {
    return this.buffer;
  }
}

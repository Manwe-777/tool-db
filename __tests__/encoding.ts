import {
  toBase64,
  fromBase64,
  uint8ToBase64,
  base64ToUint8,
  stringToArrayBuffer,
  arrayBufferToString,
  arrayBufferToHex,
  hexToArrayBuffer,
} from "../packages/tool-db";

describe("Base64 encoding utilities", () => {
  it("Converts string to base64 and back", () => {
    const original = "Hello, World!";
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);

    expect(encoded).toBe("SGVsbG8sIFdvcmxkIQ==");
    expect(decoded).toBe(original);
  });

  it("Handles special characters in base64", () => {
    const original = "Test with special chars: áéíóú ñ 你好";
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);

    expect(decoded).toBe(original);
  });

  it("Handles empty string", () => {
    const original = "";
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);

    expect(encoded).toBe("");
    expect(decoded).toBe(original);
  });

  it("Converts Uint8Array to base64 and back", () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = uint8ToBase64(original);
    const decoded = base64ToUint8(encoded);

    expect(encoded).toBe("SGVsbG8=");
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("Handles empty Uint8Array", () => {
    const original = new Uint8Array([]);
    const encoded = uint8ToBase64(original);
    const decoded = base64ToUint8(encoded);

    expect(encoded).toBe("");
    expect(Array.from(decoded)).toEqual([]);
  });

  it("Handles binary data in Uint8Array", () => {
    const original = new Uint8Array([0, 128, 255, 1, 254]);
    const encoded = uint8ToBase64(original);
    const decoded = base64ToUint8(encoded);

    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});

describe("ArrayBuffer encoding utilities", () => {
  it("Converts string to ArrayBuffer and back", () => {
    const original = "TestString123";
    const buffer = stringToArrayBuffer(original);
    const result = arrayBufferToString(buffer);

    expect(result).toBe(original);
  });

  it("Converts ArrayBuffer to hex and back", () => {
    const original = "Hello";
    const buffer = stringToArrayBuffer(original);
    const hex = arrayBufferToHex(buffer);
    const backToBuffer = hexToArrayBuffer(hex);
    const result = arrayBufferToString(backToBuffer);

    expect(hex).toBe("48656c6c6f");
    expect(result).toBe(original);
  });

  it("Handles empty ArrayBuffer", () => {
    const buffer = new ArrayBuffer(0);
    const hex = arrayBufferToHex(buffer);
    const backToBuffer = hexToArrayBuffer(hex);

    expect(hex).toBe("");
    expect(backToBuffer.byteLength).toBe(0);
  });

  it("Handles binary data correctly", () => {
    const original = new Uint8Array([0x00, 0xff, 0x80, 0x7f]);
    const hex = arrayBufferToHex(original.buffer);
    const backToBuffer = hexToArrayBuffer(hex);
    const result = new Uint8Array(backToBuffer);

    expect(hex).toBe("00ff807f");
    expect(Array.from(result)).toEqual(Array.from(original));
  });
});


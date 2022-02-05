import { base64ToArrayBuffer } from "..";
import arrayBufferToBase64 from "../utils/arrayBufferToBase64";
import arrayBufferToString from "../utils/arrayBufferToString";
import base64ToUint8 from "../utils/base64ToUint8";
import fromBase64 from "../utils/fromBase64";
import stringToArrayBuffer from "../utils/stringToArrayBuffer";
import toBase64 from "../utils/toBase64";
import uint8ToBase64 from "../utils/uint8ToBase64";

const TestValue = "SomeVeryTest-yValue2";

function compare(a: any, b: any) {
  for (let i = a.length; -1 < i; i -= 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const testUint8 = new Uint8Array([1, 2, 3, 4, 5, 6]);

const testArayBuffer = new ArrayBuffer(8);
const bufView = new Uint8Array(testArayBuffer);
bufView[0] = 71;
bufView[1] = 35;
bufView[2] = 52;
bufView[3] = 58;
bufView[4] = 62;
bufView[5] = 44;
bufView[6] = 38;
bufView[7] = 47;

it("Converts a string to base64", () => {
  expect(toBase64(TestValue)).toEqual("U29tZVZlcnlUZXN0LXlWYWx1ZTI=");
  expect(
    toBase64(
      "Note, that is an important requirement which did not appear to be included at original Question?"
    )
  ).toEqual(
    "Tm90ZSwgdGhhdCBpcyBhbiBpbXBvcnRhbnQgcmVxdWlyZW1lbnQgd2hpY2ggZGlkIG5vdCBhcHBlYXIgdG8gYmUgaW5jbHVkZWQgYXQgb3JpZ2luYWwgUXVlc3Rpb24/"
  );
});

it("Converts base64 to string", () => {
  expect(fromBase64("SGVsbG8gV29ybGQh")).toEqual("Hello World!");
  expect(
    fromBase64(
      "Tm90ZSwgdGhhdCBpcyBhbiBpbXBvcnRhbnQgcmVxdWlyZW1lbnQgd2hpY2ggZGlkIG5vdCBhcHBlYXIgdG8gYmUgaW5jbHVkZWQgYXQgb3JpZ2luYWwgUXVlc3Rpb24/"
    )
  ).toEqual(
    "Note, that is an important requirement which did not appear to be included at original Question?"
  );
});

it("Converts base64 to uint8", () => {
  const testVal = base64ToUint8("AQIDBAUG");
  expect(compare(testVal, testUint8)).toBeTruthy();
});

it("Converts uint8 to base64", () => {
  expect(uint8ToBase64(new Uint8Array(20))).toEqual(
    "AAAAAAAAAAAAAAAAAAAAAAAAAAA="
  );
  expect(uint8ToBase64(testUint8)).toEqual("AQIDBAUG");
});

it("Converts string to arraybuffer", () => {
  expect(compare(stringToArrayBuffer("G#4:>,&/"), testArayBuffer)).toBeTruthy();
});

it("Converts base64 to arraybuffer", () => {
  expect(
    compare(base64ToArrayBuffer("RyM0Oj4sJi8="), testArayBuffer)
  ).toBeTruthy();
});

it("Converts arraybuffer to string", () => {
  expect(arrayBufferToString(testArayBuffer)).toStrictEqual("G#4:>,&/");
});

it("Converts arraybuffer to base64", () => {
  expect(arrayBufferToBase64(testArayBuffer)).toEqual("RyM0Oj4sJi8=");
});

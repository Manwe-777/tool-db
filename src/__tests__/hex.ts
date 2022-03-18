import base64ToHex from "../utils/encoding/base64ToHex";
import hexToString from "../utils/encoding/hexToString";
import stringToArrayBuffer from "../utils/encoding/stringToArrayBuffer";
import arrayBufferToHex from "../utils/encoding/arrayBufferToHex";
import uint8ArrayToHex from "../utils/encoding/uint8ArrayToHex";

const TestValue = "Very test, much value";

it("Converts base64 to hex", () => {
  expect(base64ToHex("U29tZVZlcnlUZXN0LXlWYWx1ZTI=")).toEqual(
    "536f6d6556657279546573742d7956616c756532"
  );
});

it("Converts hex to string", () => {
  expect(hexToString("536f6d6556657279546573742d7956616c756532")).toEqual(
    "SomeVeryTest-yValue2"
  );
});

it("Converts string to hex", () => {
  expect(arrayBufferToHex(stringToArrayBuffer("SomeVeryTest-yValue2"))).toEqual(
    "536f6d6556657279546573742d7956616c756532"
  );
});

it("Converts uint8 to hex", () => {
  expect(
    uint8ArrayToHex(new Uint8Array([10, 15, 25, 32, 33, 43, 35, 36, 75, 128]))
  ).toEqual("0a0f1920212b23244b80");
});

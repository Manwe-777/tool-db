import {
  hexToString,
  stringToArrayBuffer,
  arrayBufferToHex,
} from "../packages/tool-db";

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

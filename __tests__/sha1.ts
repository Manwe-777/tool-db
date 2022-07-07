import { sha1 } from "../packages/tool-db";

it("Hashes with sha1/hex", () => {
  const TestValue = "SomeVeryTest-yValue2";
  expect(sha1(TestValue)).toEqual("11d5bececd3082b8b1d5d97c544337f208673ec5");
  expect(sha1(TestValue)).toEqual("11d5bececd3082b8b1d5d97c544337f208673ec5");
});

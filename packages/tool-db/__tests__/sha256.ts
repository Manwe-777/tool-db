import { sha256 } from "..";

it("Hashes with sha256/hex", () => {
  const TestValue = "SomeVeryTest-yValue2";
  expect(sha256(TestValue)).toEqual(
    "d3fd50758c6dc903a8b89afb895bc9224be3c276a0d5f94da315b583b485f4d0"
  );
  expect(sha256(TestValue)).toEqual(
    "d3fd50758c6dc903a8b89afb895bc9224be3c276a0d5f94da315b583b485f4d0"
  );
});

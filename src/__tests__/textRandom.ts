import textRandom from "../utils/textRandom";

it("Creates random text", () => {
  expect(textRandom(10)).toHaveLength(10);
});

it("Creates random text based on charset", () => {
  expect(textRandom()).toHaveLength(24);
  expect(textRandom(10)).toHaveLength(10);
  expect(textRandom(50, "abcd").indexOf("e")).toBe(-1);
  expect(textRandom(50, "abcdgf").indexOf("1")).toBe(-1);
  expect(textRandom(50, "abcd1324").indexOf("A")).toBe(-1);
});

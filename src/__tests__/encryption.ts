import { decryptWithPass, encryptWithPass, generateIv } from "..";

jest.mock("../getCrypto.ts");

const message = "A super secret encoded message";

it("can encrypt with password", async () => {
  let testDec;
  const iv = generateIv();

  const testEnc = await encryptWithPass(message, "password", iv);

  expect(testEnc).toBeDefined();

  if (testEnc) {
    testDec = await decryptWithPass(testEnc, "password", iv);
  }

  expect(testDec).toBe(message);
});

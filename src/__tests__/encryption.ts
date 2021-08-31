import decryptWithPass from "../utils/crypto/decryptWithPass";

import encryptWithPass from "../utils/crypto/encryptWithPass";
import generateIv from "../utils/generateIv";

const message = "A super secret encoded message";

it("can encrypt with password", async () => {
  let testEnc, testDec;
  const iv = generateIv();

  testEnc = await encryptWithPass(message, "password", iv);

  expect(testEnc).toBeDefined();

  if (testEnc) {
    testDec = await decryptWithPass(testEnc, "password", iv);
  }

  expect(testDec).toBe(message);
});

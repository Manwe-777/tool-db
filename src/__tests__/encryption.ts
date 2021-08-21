import { Crypto } from "@peculiar/webcrypto";
import decryptWithPass from "../utils/crypto/decryptWithPass";

import encryptWithPass from "../utils/crypto/encryptWithPass";
import generateKeyPair from "../utils/crypto/generateKeyPair";
import generateIv from "../utils/generateIv";
import signData from "../utils/signData";

(window as any).crypto = new Crypto();

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

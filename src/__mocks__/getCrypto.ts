import { Crypto } from "@peculiar/webcrypto";

export default jest.fn(() => {
  return new Crypto();
});

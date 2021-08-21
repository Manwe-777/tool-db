import proofOfWork from "../utils/proofOfWork";
import sha256 from "../utils/sha256";

it("Proof of work values are correct", () => {
  const TestValue = "SomeVeryTest-yValue";

  return proofOfWork(TestValue, 3).then((hash) => {
    expect(hash.hash.slice(0, 3)).toEqual("000");
    expect(sha256(`${TestValue}${hash.nonce}`)).toBe(hash.hash);
  });
});

it("Proof of work is hard", () => {
  const TestValue = "SomeVeryTest-yValue";

  const initTime = new Date().getTime();
  return proofOfWork(TestValue, 5).then((hash) => {
    expect(hash.hash.slice(0, 5)).toEqual("00000");

    const endTime = new Date().getTime();

    expect(endTime - initTime).toBeGreaterThan(1000);
  });
});

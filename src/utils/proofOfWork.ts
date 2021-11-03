import sha256 from "./sha256";

export default function proofOfWork(
  value: string,
  difficulty: number
): Promise<{ nonce: number; hash: string }> {
  return new Promise((resolve) => {
    let nonce = 0;
    let hash = sha256(`${value}${nonce}`);
    while (hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      nonce += 1;
      hash = sha256(`${value}${nonce}`);
    }
    resolve({ nonce, hash });
  });
}

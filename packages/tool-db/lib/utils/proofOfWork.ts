import { sha256 } from "..";

/**
 * Calculates proof of work by finding a nonce that produces a hash
 * with the required number of leading zeroes.
 * @param value The value to hash
 * @param difficulty Number of leading zeroes required. Pass null to skip POW entirely.
 * @returns Promise with nonce and hash
 */
export default function proofOfWork(
  value: string,
  difficulty: number | null
): Promise<{ nonce: number; hash: string }> {
  return new Promise((resolve) => {
    // When difficulty is null, skip POW calculation entirely
    // Just return hash with nonce 0 (useful for testing/CI)
    if (difficulty === null || difficulty === 0) {
      const hash = sha256(`${value}0`);
      resolve({ nonce: 0, hash });
      return;
    }

    let nonce = 0;
    let hash = sha256(`${value}${nonce}`);
    while (hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      nonce += 1;
      hash = sha256(`${value}${nonce}`);
    }
    resolve({ nonce, hash });
  });
}

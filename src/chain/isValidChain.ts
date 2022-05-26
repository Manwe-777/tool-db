import Block, { decodeBlock } from "./Block";

export default function isValidChain(chain: string[]) {
  if (decodeBlock(chain[0]).height !== 0) return false;

  for (let i = 1; i < chain.length; i++) {
    const block = decodeBlock(chain[i]);
    const lastBlock = decodeBlock(chain[i - 1]);

    if (
      block.lastHash !== lastBlock.hash ||
      block.hash !== Block.blockHash(block)
    ) {
      return false;
    }
  }

  return true;
}

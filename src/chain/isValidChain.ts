import Block from "./Block";

export default function isValidChain(chain: Block[]) {
  if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
    return false;

  for (let i = 1; i < chain.length; i++) {
    const block = chain[i];
    const lastBlock = chain[i - 1];
    if (
      block.lastHash !== lastBlock.hash ||
      block.hash !== Block.blockHash(block)
    )
      return false;
  }

  return true;
}

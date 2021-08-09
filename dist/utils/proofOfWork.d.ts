export default function proofOfWork(value: string, difficulty: number): Promise<{
    nonce: number;
    hash: string;
}>;

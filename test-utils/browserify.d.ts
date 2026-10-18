// browserify has no type definitions, only the part the tests use
declare module "browserify" {
  interface Bundler {
    bundle(callback: (err: Error | null, buffer: Buffer) => void): void;
  }
  export default function browserify(
    file: string,
    options?: { standalone?: string }
  ): Bundler;
}

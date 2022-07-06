import { ToolDb, sha1 } from ".";

export default function logger(
  this: ToolDb,
  arg0: any,
  arg1?: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any
) {
  if (this.options.debug) {
    const isNode = typeof window === "undefined";
    const title = isNode
      ? this.options.storageName
      : "%c" + this.options.storageName;

    const style = isNode
      ? ""
      : "background: #" +
        sha1(this.options.storageName).slice(-6) +
        "; padding: 2px; color: black";

    console.log(
      title,
      style,
      ...[arg0, arg1, arg2, arg3, arg4, arg4, arg5].slice(0, arguments.length)
    );
  }
}

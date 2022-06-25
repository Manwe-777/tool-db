import ToolDb from "./tooldb";
import sha1 from "./utils/sha1";

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
    const title =
      typeof window === "undefined"
        ? this.options.storageName
        : "%c" + this.options.storageName;
    const style =
      typeof window === "undefined"
        ? ""
        : "background: #" +
          sha1(this.options.storageName).slice(-6) +
          "; padding: 2px; color: black";
    if (!arg1) console.log(title, style, arg0);
    else if (!arg2) console.log(title, style, arg0, arg1);
    else if (!arg3) console.log(title, style, arg0, arg1, arg2);
    else if (!arg4) console.log(title, style, arg0, arg1, arg2, arg3);
    else if (!arg5) console.log(title, style, arg0, arg1, arg2, arg3, arg4);
    else console.log(title, style, arg0, arg1, arg2, arg3, arg4, arg4, arg5);
  }
}

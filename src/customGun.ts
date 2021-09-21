// @ts-nocheck

import { VerifyResult } from ".";
import shared from "./shared";

async function verification(msg) {
  if (msg.put) {
    const keys = Object.keys(msg.put);
    const promises = keys.map(async (key) => {
      let data = {};
      if (msg.put[key]?.v) {
        try {
          data = JSON.parse(msg.put[key].v);
        } catch (e) {
          //
        }
      }
      const toolDb = shared.toolDb;
      return await toolDb.verify(data);
    });
    const verifiedList = await Promise.all(promises).catch(console.error);

    if (
      verifiedList.filter((r) => r === VerifyResult.Verified).length ===
      keys.length
    ) {
      this.to.next(msg);
      // console.log("Verification > OK", msg);
      return;
    }
    // console.log("Verification > NOT OK", msg, verifiedList);
    return;
  } else {
    // console.log("Verification > Skipped", msg);
    this.to.next(msg);
  }
}

async function putCheck(msg) {
  if (msg.put) {
    const key = msg.put["#"];
    let data = {};
    try {
      data = JSON.parse(msg.put[":"]);
    } catch (e) {
      // console.warn(e);
    }
    if (data && data.value) {
      const toolDb = shared.toolDb;
      // console.log("PUT", key, data);

      // Stop if its not verified!
      const verify = await toolDb.verify(data);
      if (verify !== VerifyResult.Verified) {
        return;
      }

      // Check listeners
      toolDb._keyListeners.forEach((listener) => {
        if (key.startsWith(listener.key)) {
          if (listener.timeout) clearTimeout(listener.timeout);
          listener.timeout = setTimeout(() => {
            listener.fn(data.value);
            listener.timeout = null;
          }, 250);
        }
      });
    }
    // if (key && key.startsWith("==")) {
    //   if (msg._.root.graph[key]) {
    //     console.log("Illegal dupe, Not putting");
    //     return;
    //   }
    // }
  }
  this.to.next(msg);
  return;
}

export default function customGun(toolDb, _gun: any = undefined) {
  (_gun || require("gun")).on("create", function (ctx) {
    ctx.on("in", verification);
    ctx.on("out", verification);
    ctx.on("put", putCheck);
    this.to.next(ctx);
  });
}

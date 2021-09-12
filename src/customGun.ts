// @ts-nocheck

import { verifyMessage, VerifyResult } from ".";

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
      return await verifyMessage(data);
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
    // console.log("Verification > NOT OK", msg);
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
      console.log("PUT", key, data);
      (window || global).toolDb._keyListeners.forEach((listener) => {
        if (key.startsWith(listener.key)) {
          if (listener.timeout) clearTimeout(listener.timeout);
          listener.timeout = setTimeout(() => {
            listener.fn(data.value);
            listener.timeout = null;
          }, 250);
        }
      });

      const verify = await verifyMessage(data);
      if (verify === VerifyResult.Verified) {
        this.to.next(msg);
        return;
      }
    }
    return;
    // if (key && key.startsWith("==")) {
    //   if (msg._.root.graph[key]) {
    //     console.log("Illegal dupe, Not putting");
    //     return;
    //   }
    // }
  }
  this.to.next(msg);
}

export default function customGun(toolDb, _gun: any = undefined) {
  (_gun || Gun).on("create", function (ctx) {
    ctx.on("in", verification);
    ctx.on("out", verification);
    ctx.on("put", putCheck);
    this.to.next(ctx);
  });
}

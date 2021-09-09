/* eslint-disable */
// @ts-nocheck

import { verifyMessage, VerifyResult } from ".";

async function verification(msg) {
  // console.log("Middleware", msg);
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
      console.log("Verification OK", verifiedList);
      return;
    }
    console.log("Verification NOT OK", verifiedList, keys, msg);
    return;
  } else {
    this.to.next(msg);
  }
}

// function putCheck(msg) {
//   // console.log("PUT", msg);
//   if (msg.put) {
//     const key = msg.put["#"];
//     if (key && key.startsWith("==")) {
//       if (msg._.root.graph[key]) {
//         console.log("Illegal dupe, Not putting");
//         return;
//       }
//     }
//   }
//   this.to.next(msg);
// }

export default function customGun(g = undefined) {
  (g || Gun).on("create", function (ctx) {
    ctx.on("in", verification);
    ctx.on("out", verification);
    // ctx.on("put", putCheck);
    this.to.next(ctx);
  });
}

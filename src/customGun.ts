/* eslint-disable */
// @ts-nocheck

import { verifyMessage, VerifyResult } from ".";

async function security(msg) {
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
      // console.log("Verification OK", verifiedList);
      return;
    }
    // console.log("Verification NOT OK", verifiedList, keys, msg);
    return;
  } else {
    this.to.next(msg);
  }
}

export default function customGun() {
  Gun.on("create", function (ctx) {
    ctx.on("in", security);
    ctx.on("out", security);
    this.to.next(ctx);
  });
}

import { GraphEntryValue, ToolDbClient, verifyMessage, VerifyResult } from ".";

export default function toolDbVerificationWrapper(
  this: ToolDbClient,
  data: GraphEntryValue<any>
) {
  // This wrapper function adds our custom verification functions to all messages.
  return new Promise((resolve, reject) => {
    verifyMessage(data).then(async (verified) => {
      if (verified) {
        let skipCustom = true;
        this._customVerificator.forEach((listener) => {
          if (listener && data.key && data.key.startsWith(listener.key)) {
            skipCustom = false;
            listener
              .fn(data)
              .then((verified) => {
                if (verified) {
                  resolve(VerifyResult.Verified);
                } else {
                  resolve(VerifyResult.CustomVerificationFailed);
                }
              })
              .catch((e) => {
                resolve(VerifyResult.CustomVerificationFailed);
              });
          }
        });

        if (skipCustom) {
          resolve(verified);
        }
      } else {
        resolve(VerifyResult.InvalidVerification);
      }
    });
  });
}

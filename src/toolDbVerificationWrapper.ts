import { BaseMessage, ToolDb, VerificationData, VerifyResult } from ".";

export default function toolDbVerificationWrapper(
  this: ToolDb,
  data: VerificationData<any> & BaseMessage
) {
  // This wrapper function adds our custom verification functions to all messages.
  return new Promise((resolve) => {
    this.verifyMessage(data, this.options.pow).then(async (verified) => {
      if (verified) {
        let skipCustom = true;
        this._customVerificator.forEach((listener) => {
          if (listener && data.k && data.k.startsWith(listener.key)) {
            skipCustom = false;
            listener
              .fn(data)
              .then((verified: boolean) => {
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

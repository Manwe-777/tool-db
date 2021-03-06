import { ToolDb, VerificationData, VerifyResult } from ".";

export default function toolDbVerificationWrapper(
  this: ToolDb,
  data: VerificationData<any>
) {
  // This wrapper function adds our custom verification functions to all messages.
  return new Promise((resolve) => {
    this.verifyMessage(data, this.options.pow).then(async (verified) => {
      if (verified) {
        let skipCustom = true;
        this._customVerificator.forEach((listener) => {
          if (listener && data.k && data.k.startsWith(listener.key)) {
            skipCustom = false;

            let previousData: any = undefined;
            // Get the previously stored value of this key
            this.store
              .get(data.k)
              .then((prev) => {
                try {
                  previousData = JSON.parse(prev);
                } catch (e) {
                  // do nothing
                }
              })
              .catch((e) => {
                // do nothing
              })
              .finally(() => {
                listener
                  .fn(data, previousData)
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

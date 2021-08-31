import { GraphEntryValue } from "./types/graph";
import { VerifyResult } from "./types/message";

import verifyMessage from "./utils/verifyMessage";

class ToolChainService {
  private debug = false;
  /**
   * These can be customized depending on your db of choice.
   */
  public dbInit = () => {
    console.log("You need to configure db!");
  };

  public dbRead = <T>(key: string): Promise<T> => {
    console.log("You need to configure db!");
    return new Promise((r) => r({} as T));
  };

  public dbWrite = <T>(key: string, msg: T) => {
    console.log("You need to configure db!");
  };

  public triggerPut = (msg: GraphEntryValue) => {
    //
  };

  public onMessage = (msg: GraphEntryValue, peerId: string) => {
    //
  };

  private _customVerification: Record<
    string,
    (oldData: GraphEntryValue | undefined, data: GraphEntryValue) => boolean
  > = {};

  /**
   * Adds an extra verification step for messages at the given key.
   * You can compare against a previously stored value using the value given at the callback.
   * The callback should return a boolean for if the message passed the verification step.
   * @param key data key
   * @param fn (stored, incoming) => boolean
   */
  public addVerification = (
    key: string,
    fn: (oldData: GraphEntryValue | undefined, data: GraphEntryValue) => boolean
  ) => {
    this._customVerification[key] = fn;
  };

  private async dataPutHandler(msg: GraphEntryValue) {
    const oldValue = await this.dbRead<GraphEntryValue>(msg.key);
    // if (this.debug) console.log("Recv PUT", msg, oldValue);

    if (
      !oldValue ||
      (oldValue.timestamp < msg.timestamp &&
        (msg.key.slice(0, 1) == "~" ? oldValue.pub === msg.pub : true))
    ) {
      this.dbWrite(msg.key, msg);
      this.triggerPut(msg);
    } else {
      // console.warn(`Skip message write!`, oldValue, msg);
    }
  }

  public messageWrapper = async (data: GraphEntryValue) => {
    // This wrapper functions filters out those messages we already handled from the listener
    // It also takes care of verification, data persistence and low level handling
    return new Promise((resolve, reject) => {
      verifyMessage(data).then(async (verified) => {
        if (verified) {
          if (this._customVerification[data.key]) {
            const oldValue = await this.dbRead<GraphEntryValue>(data.key);
            verified = !this._customVerification[data.key](
              oldValue || undefined,
              data
            )
              ? VerifyResult.InvalidVerification
              : verified;
          }
        }

        if (verified === VerifyResult.Verified) {
          this.dataPutHandler(data);
          resolve(true);
        } else {
          reject(new Error(`Could not verify message integrity: ${verified}`));
          console.warn(data);
        }
      });
    });
  };

  constructor(debug = false) {
    this.debug = debug;
    this.dbInit();
  }
}

export default ToolChainService;

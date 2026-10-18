import {
  ToolDb,
  NostrEvent,
  FunctionCodes,
  FunctionReturn,
  getTagValue,
} from "..";

/**
 * Server function requests and responses are ephemeral events: relays
 * forward them, but never store them.
 * Not used by any NIP, see NOSTR_FIRST.md.
 */
export const FUNCTION_REQUEST_KIND = 21078;

export const FUNCTION_RESPONSE_KIND = 21079;

const FUNCTION_CODES: FunctionCodes[] = ["OK", "ERR", "NOT_FOUND"];

export interface FunctionRequest {
  name: string;
  args: any;
}

/**
 * Reads a function request event addressed to `server`
 * @returns the request, or undefined if it is not a valid request for it
 */
export function parseFunctionRequest(
  event: NostrEvent,
  server: string
): FunctionRequest | undefined {
  if (event.kind !== FUNCTION_REQUEST_KIND) return undefined;
  if (getTagValue(event, "p") !== server) return undefined;

  const name = getTagValue(event, "f");
  if (!name) return undefined;

  try {
    return { name, args: JSON.parse(event.content) };
  } catch (e) {
    return undefined;
  }
}

/**
 * The response to a function request, before it is signed
 */
export function createFunctionResponse(
  request: NostrEvent,
  response: FunctionReturn<any>
) {
  return {
    kind: FUNCTION_RESPONSE_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", request.id],
      ["p", request.pubkey],
    ],
    content: JSON.stringify(response),
  };
}

function parseFunctionResponse(
  event: NostrEvent
): FunctionReturn<any> | undefined {
  try {
    const response = JSON.parse(event.content);
    return FUNCTION_CODES.includes(response?.code) ? response : undefined;
  } catch (e) {
    return undefined;
  }
}

export interface DoFunctionOptions {
  /**
   * Public key of the server to run the function on, defaults to the
   * `functionServers` option
   */
  server?: string;
  timeoutMs?: number;
}

/**
 * Runs a function on a ToolDB relay node.
 * Only responses signed by the trusted servers are accepted.
 * @returns the function return, or an error if no server answered in time
 */
export async function doFunction<R = any, A = any>(
  this: ToolDb,
  name: string,
  args: A,
  options: DoFunctionOptions = {}
): Promise<FunctionReturn<R>> {
  const servers = options.server
    ? [options.server]
    : this.options.functionServers;

  if (servers.length === 0) {
    return { code: "ERR", return: "No function servers configured" };
  }

  const request = await this.userAccount.signEvent({
    kind: FUNCTION_REQUEST_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ...servers.map((server) => ["p", server]),
      ["t", this.options.topic],
      ["f", name],
    ],
    content: JSON.stringify(args === undefined ? null : args),
  });

  this.logger("FUNCTION", name, request);

  return new Promise((resolve) => {
    let close = () => {
      // assigned below
    };

    const timeout = setTimeout(() => {
      close();
      resolve({ code: "ERR", return: "No server answered in time" });
    }, options.timeoutMs ?? 10000);

    close = this.relays.subscribe(
      [
        {
          kinds: [FUNCTION_RESPONSE_KIND],
          "#e": [request.id],
          authors: servers,
        },
      ],
      (event) => {
        // Relays are not trusted, check the author again
        if (!servers.includes(event.pubkey)) return;
        const response = parseFunctionResponse(event);
        if (!response) return;

        clearTimeout(timeout);
        close();
        resolve(response);
      }
    );

    this.relays
      .publish(request)
      .catch((e) => this.logger("Could not publish", e));
  });
}

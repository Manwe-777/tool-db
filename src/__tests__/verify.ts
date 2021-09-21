import { VerifyResult } from "../types/message";
import verifyMessage from "../utils/verifyMessage";

import { GraphEntryValue } from "../types/graph";
import catchReturn from "../utils/catchReturn";

jest.mock("../getCrypto.ts");

const putOk: GraphEntryValue = {
  key: "value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  nonce: 679,
  timestamp: 1628918110150,
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  value: "AzB4NzijkW",
};

it("Can verify PUT", () => {
  return verifyMessage(putOk).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const putSig: GraphEntryValue = {
  key: "value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  nonce: 679,
  timestamp: 1628918110150,
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  sig: "Z2fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  value: "AzB4NzijkW",
};

it("Can catch tampered messages (signature)", () => {
  return verifyMessage(putSig).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidSignature);
  });
});

it("Can catch messages with missing data", () => {
  const delA: any = delete { ...putOk }.hash;
  const pa = verifyMessage(delA).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delB: any = delete { ...putOk }.key;
  const pb = verifyMessage(delB).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delC: any = delete { ...putOk }.nonce;
  const pc = verifyMessage(delC).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delD: any = delete { ...putOk }.pub;
  const pd = verifyMessage(delD).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delE: any = delete { ...putOk }.sig;
  const pe = verifyMessage(delE).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delF: any = delete { ...putOk }.timestamp;
  const pf = verifyMessage(delF).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delG: any = delete { ...putOk }.value;
  const pg = verifyMessage(delG).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  return Promise.all([pa, pb, pc, pd, pe, pf, pg]);
});

it("Can print errors", async () => {
  const rejectPromise = new Promise((resolve, reject) => {
    reject();
  }).catch(catchReturn);

  expect(await rejectPromise).toBe(undefined);
});

const putTime: GraphEntryValue = {
  key: "value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  nonce: 679,
  timestamp: 2628918110150,
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  value: "AzB4NzijkW",
};

it("Can catch tampered messages (time)", () => {
  return verifyMessage(putTime).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidTimestamp);
  });
});

const putPow: GraphEntryValue = {
  key: "value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  nonce: 679,
  timestamp: 1628918110150,
  hash: "00a6fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  value: "AzB4NzijkW",
};

// it("Can catch tampered messages (pow)", () => {
//   return verifyMessage(putPow).then((result) => {
//     expect(result).toEqual(VerifyResult.NoProofOfWork);
//   });
// });

const putNonce: GraphEntryValue = {
  key: "value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  nonce: 111,
  timestamp: 1628918110150,
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  value: "AzB4NzijkW",
};

// it("Can catch tampered messages (nonce)", () => {
//   return verifyMessage(putNonce).then((result) => {
//     expect(result).toEqual(VerifyResult.InvalidHashNonce);
//   });
// });

const putValue: GraphEntryValue = {
  key: "value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  nonce: 679,
  timestamp: 1628918110150,
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  value: "hackerman",
};

// it("Can catch tampered messages (value)", () => {
//   return verifyMessage(putValue).then((result) => {
//     expect(result).toEqual(VerifyResult.InvalidHashNonce);
//   });
// });

const privatePut: GraphEntryValue = {
  key: ":MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==.value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
  nonce: 1268,
  timestamp: 1628919444909,
  hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
  sig: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
  value: { test: "a1AMXh4hZhI2lc5ONBa5" },
};

it("Can verify namespaced PUT", () => {
  return verifyMessage(privatePut).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const privatePutPubkey: GraphEntryValue = {
  key: ":MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Gw==.value",
  pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
  nonce: 1268,
  timestamp: 1628919444909,
  hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
  sig: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
  value: { test: "a1AMXh4hZhI2lc5ONBa5" },
};

it("Can catch pubkey replacement", () => {
  return verifyMessage(privatePutPubkey).then((result) => {
    expect(result).toEqual(VerifyResult.PubKeyMismatch);
  });
});

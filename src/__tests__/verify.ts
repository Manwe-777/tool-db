import { MessageGet, MessagePut, VerifyResult } from "../types/message";
import verifyMessage from "../utils/verifyMessage";

import { Crypto } from "@peculiar/webcrypto";
(window as any).crypto = new Crypto();

const putOk: MessagePut = {
  type: "put",
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  val: {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
  },
};

it("Can verify PUT", () => {
  return verifyMessage(putOk).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const putSig: MessagePut = {
  type: "put",
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  val: {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z2fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
  },
};

it("Can catch tampered messages (signature)", () => {
  return verifyMessage(putSig).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidSignature);
  });
});

const putTime: MessagePut = {
  type: "put",
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  val: {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 2628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
  },
};

it("Can catch tampered messages (time)", () => {
  return verifyMessage(putTime).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidTimestamp);
  });
});

const putPow: MessagePut = {
  type: "put",
  hash: "006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  val: {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
  },
};

it("Can catch tampered messages (pow)", () => {
  return verifyMessage(putPow).then((result) => {
    expect(result).toEqual(VerifyResult.NoProofOfWork);
  });
});

const putNonce: MessagePut = {
  type: "put",
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  val: {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 111,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "AzB4NzijkW",
  },
};

it("Can catch tampered messages (nonce)", () => {
  return verifyMessage(putNonce).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidHashNonce);
  });
});

const putValue: MessagePut = {
  type: "put",
  hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  val: {
    key: "value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
    nonce: 679,
    timestamp: 1628918110150,
    hash: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
    sig: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
    value: "hackerman",
  },
};

it("Can catch tampered messages (value)", () => {
  return verifyMessage(putValue).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidHashNonce);
  });
});

const privatePut: MessagePut = {
  type: "put",
  hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
  val: {
    key: "~MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==.value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
    nonce: 1268,
    timestamp: 1628919444909,
    hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
    sig: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
    value: { test: "a1AMXh4hZhI2lc5ONBa5" },
  },
};

it("Can verify namespaced PUT", () => {
  return verifyMessage(privatePut).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const privatePutPubkey: MessagePut = {
  type: "put",
  hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
  val: {
    key: "~MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Gw==.value",
    pub: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
    nonce: 1268,
    timestamp: 1628919444909,
    hash: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
    sig: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
    value: { test: "a1AMXh4hZhI2lc5ONBa5" },
  },
};

it("Can catch pubkey replacement", () => {
  return verifyMessage(privatePutPubkey).then((result) => {
    expect(result).toEqual(VerifyResult.PubKeyMismatch);
  });
});

const getTest: MessageGet = {
  hash: "083f08399a07b4df0882cf6f0c0a9f23bf502b310429a7849325512acda6b262",
  source: "somepeer",
  type: "get",
  key: "~MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEIKMPa/C8lLJ7VsOQVlLtjV8KreRdK0DbygHXgURdsSFhUUMcSJxiK+Ovi4xkOuPxL0at+pIdLnc8vcjfjwoSig==.value",
};

it("Can verify GET", () => {
  return verifyMessage(getTest).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

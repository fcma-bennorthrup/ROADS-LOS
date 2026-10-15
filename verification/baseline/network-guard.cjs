// Preloaded in the validation process and inherited by its Node workers.
// This is a defense for trusted fixtures, not an OS security sandbox.
const deny = () => { throw new Error("VALIDATION_EXTERNAL_TRANSPORT_BLOCKED"); };
require("node:net").Socket.prototype.connect = deny;
for (const name of ["node:http", "node:https"]) {
  const api = require(name);
  api.request = deny;
  api.get = deny;
}
require("node:dgram").createSocket = deny;
globalThis.fetch = deny;
globalThis.WebSocket = class { constructor() { deny(); } };
require("node:module").syncBuiltinESMExports();

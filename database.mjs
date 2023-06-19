import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Client = require("@replit/database");
const client = new Client(process.env.REPLIT_DB_URL);

/*
DB schema:

"merchants" : {
  "merchantSetupId" : "merchantToken"
}
*/

export async function accountCheck(merchantSetupId){
  const merchants = await client.get("merchants")
  return merchants[merchantSetupId];  
}

await client.set("key", "value");

let key = await client.get("bloop");
console.log(key);
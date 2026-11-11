import { pick, type RandomInt } from "./random";

/** Salesforce-level synthetic identity, independent of storage and the clock. */
export function syntheticBorrower({ cif, now, random, known = {} }: {
  cif: string; now: Date; random: RandomInt; known?: Record<string, unknown>;
}) {
  const saved = (key: string) => typeof known[key] === "string" && (known[key] as string).trim()
    ? known[key] as string : undefined;
  const firstName = saved("firstName") ?? pick(random, ["Avery", "Jordan", "Morgan", "Taylor", "Casey", "Alex"]);
  const lastName = saved("lastName") ?? pick(random, ["Parker", "Bennett", "Hayes", "Reed", "Ellis", "Brooks"]);
  const locations = [
    { city: "Louisville", state: "KY", zip: "40202", areaCode: "502" },
    { city: "Indianapolis", state: "IN", zip: "46204", areaCode: "317" },
    { city: "Columbus", state: "OH", zip: "43215", areaCode: "614" },
  ];
  const needsLocation = ["city", "state", "zip", "phone"].some(key => !saved(key));
  const location = needsLocation
    ? locations.find(item => item.zip === saved("zip") || item.city === saved("city")) ?? pick(random, locations)
    : locations[0];
  const phone = saved("phone") ?? `(${location.areaCode}) 555-${random(100, 200).toString().padStart(4, "0")}`;
  const email = saved("email") ?? `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${cif}@example.com`;
  const dob = saved("dob") ?? `${now.getUTCFullYear() - random(25, 66)}-${String(random(1, 13)).padStart(2, "0")}-${String(random(1, 29)).padStart(2, "0")}`;
  return {
    firstName, lastName,
    ssn: saved("ssn") ?? `000-${random(10, 100)}-${String(random(0, 10000)).padStart(4, "0")}`,
    dob, phone, email,
    address: saved("address") ?? `${random(100, 1000)} Example Lane`,
    city: saved("city") ?? location.city, state: saved("state") ?? location.state, zip: saved("zip") ?? location.zip,
    maritalStatus: "", dependents: "", dependentsAges: "", farmInvolvement: "",
  };
}

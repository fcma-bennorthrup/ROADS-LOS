import { pick, type RandomInt } from "./random";

/** Salesforce-level synthetic identity, independent of storage and the clock. */
export function syntheticBorrower({ cif, now, random }: {
  cif: string; now: Date; random: RandomInt;
}) {
  const firstName = pick(random, ["Avery", "Jordan", "Morgan", "Taylor", "Casey", "Alex"]);
  const lastName = pick(random, ["Parker", "Bennett", "Hayes", "Reed", "Ellis", "Brooks"]);
  const location = pick(random, [
    { city: "Louisville", state: "KY", zip: "40202", areaCode: "502" },
    { city: "Indianapolis", state: "IN", zip: "46204", areaCode: "317" },
    { city: "Columbus", state: "OH", zip: "43215", areaCode: "614" },
  ]);
  const phone = `(${location.areaCode}) 555-${random(100, 200).toString().padStart(4, "0")}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${cif}@example.com`;
  const dob = `${now.getUTCFullYear() - random(25, 66)}-${String(random(1, 13)).padStart(2, "0")}-${String(random(1, 29)).padStart(2, "0")}`;
  return {
    firstName, lastName,
    ssn: `000-${random(10, 100)}-${String(random(0, 10000)).padStart(4, "0")}`,
    dob, phone, email,
    address: `${random(100, 1000)} Example Lane`,
    city: location.city, state: location.state, zip: location.zip,
    maritalStatus: "", dependents: "", dependentsAges: "", farmInvolvement: "",
  };
}

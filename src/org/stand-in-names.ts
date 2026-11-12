// STAND-IN names for the people the person roster does not name. Every name
// here is invented: a given name and the initial of a family name, as the
// roster writes its own. None of the given names is one the roster uses, so a
// stand-in is never taken for a roster person.
const GIVEN = [
  "Adam",
  "Aisyah",
  "Amir",
  "Anita",
  "Azlan",
  "Bala",
  "Cheng",
  "Dania",
  "Darren",
  "Diana",
  "Edwin",
  "Emma",
  "Fahmi",
  "Fiona",
  "Ganesh",
  "Hakim",
  "Haziq",
  "Irene",
  "Ismail",
  "Jasmine",
  "Jason",
  "Karthik",
  "Khairul",
  "Lakshmi",
  "Li Ting",
  "Marcus",
  "Maya",
  "Nabil",
  "Naveen",
  "Nisha",
  "Olivia",
  "Pei Ling",
  "Rahim",
  "Rina",
  "Sabrina",
  "Sanjay",
  "Shafiq",
  "Siti",
  "Syafiq",
  "Tasha",
  "Thiru",
  "Vikram",
  "Wai Kit",
  "Yasmin",
  "Yong",
  "Zaid",
  "Zul",
  "Hui Min",
  "Kiran",
  "Melissa",
  "Nazri",
  "Puteri",
  "Rajan",
  "Shanti",
  "Tariq",
  "Uma",
  "Victor",
  "Wan",
  "Yen",
  "Zainab",
];
const INITIALS = "ABCDGHKLMNOPRSTWYZ".split("");
const COMBOS = GIVEN.length * INITIALS.length;

/** The invented name of a person by their id (`p0042`): the same id, the same name, and no two alike. */
export function standInName(person: string): string {
  const n = Number(person.replace(/\D/g, "")) || 0;
  // A step with no factor in common with the count, so ids in a row do not share a given name.
  const k = (n * 487) % COMBOS;
  return `${GIVEN[k % GIVEN.length]} ${INITIALS[Math.floor(k / GIVEN.length)]}.`;
}

export type SignupLocation = {
  id: string;
  name: string;
};

export const SIGNUP_LOCATIONS: SignupLocation[] = [
  { id: "honeysuckle-airpot", name: "HoneySuckle Airpot" },
  { id: "honeysuckle-osu", name: "HoneySuckle Osu" },
  { id: "honeysuckle-labone", name: "HoneySuckle Labone" },
  { id: "honeysuckle-east-legon", name: "HoneySuckle East Legon" },
  { id: "honeysuckle-spintex", name: "HoneySuckle Spintex" },
  { id: "pit-stop-labone", name: "Pit Stop Labone" },
  { id: "goldcoast-restaurant", name: "GoldCoast Restaurant" },
];

export function findSignupLocation(locationId?: string): SignupLocation | null {
  if (!locationId) return null;
  const normalized = locationId.trim().toLowerCase();
  return SIGNUP_LOCATIONS.find((l) => l.id === normalized) ?? null;
}

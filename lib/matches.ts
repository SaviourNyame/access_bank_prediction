export type Team = {
  name: string;
  flag: string;
  badgeBg: string;
};

export type Match = {
  id: number;
  round: 1 | 2 | 3;
  teamA: Team;
  teamB: Team;
  date: string;   // "DD.MM."
  time: string;   // "HH:MM"
  deadlineMs: number;
};

// ─── Team registry ───────────────────────────────────────────────────────────
const T: Record<string, Team> = {
  "Mexico":               { name: "Mexico",               flag: "🇲🇽", badgeBg: "#006847" },
  "South Africa":         { name: "South Africa",         flag: "🇿🇦", badgeBg: "#007A4D" },
  "South Korea":          { name: "South Korea",          flag: "🇰🇷", badgeBg: "#C60C30" },
  "Czech Republic":       { name: "Czech Republic",       flag: "🇨🇿", badgeBg: "#D7141A" },
  "Canada":               { name: "Canada",               flag: "🇨🇦", badgeBg: "#FF0000" },
  "Bosnia & Herzegovina": { name: "Bosnia & Herzegovina", flag: "🇧🇦", badgeBg: "#002395" },
  "USA":                  { name: "USA",                  flag: "🇺🇸", badgeBg: "#002868" },
  "Paraguay":             { name: "Paraguay",             flag: "🇵🇾", badgeBg: "#D52B1E" },
  "Qatar":                { name: "Qatar",                flag: "🇶🇦", badgeBg: "#8D1B3D" },
  "Switzerland":          { name: "Switzerland",          flag: "🇨🇭", badgeBg: "#FF0000" },
  "Brazil":               { name: "Brazil",               flag: "🇧🇷", badgeBg: "#009C3B" },
  "Morocco":              { name: "Morocco",              flag: "🇲🇦", badgeBg: "#C1272D" },
  "Haiti":                { name: "Haiti",                flag: "🇭🇹", badgeBg: "#00209F" },
  "Scotland":             { name: "Scotland",             flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", badgeBg: "#003DA5" },
  "Australia":            { name: "Australia",            flag: "🇦🇺", badgeBg: "#00008B" },
  "Turkey":               { name: "Turkey",               flag: "🇹🇷", badgeBg: "#E30A17" },
  "Germany":              { name: "Germany",              flag: "🇩🇪", badgeBg: "#2D2D2D" },
  "Curacao":              { name: "Curacao",              flag: "🇨🇼", badgeBg: "#002B7F" },
  "Netherlands":          { name: "Netherlands",          flag: "🇳🇱", badgeBg: "#E77C24" },
  "Japan":                { name: "Japan",                flag: "🇯🇵", badgeBg: "#BC002D" },
  "Ivory Coast":          { name: "Ivory Coast",          flag: "🇨🇮", badgeBg: "#F77F00" },
  "Ecuador":              { name: "Ecuador",              flag: "🇪🇨", badgeBg: "#FFD100" },
  "Sweden":               { name: "Sweden",               flag: "🇸🇪", badgeBg: "#006AA7" },
  "Tunisia":              { name: "Tunisia",              flag: "🇹🇳", badgeBg: "#E70013" },
  "Spain":                { name: "Spain",                flag: "🇪🇸", badgeBg: "#AA151B" },
  "Cape Verde":           { name: "Cape Verde",           flag: "🇨🇻", badgeBg: "#003893" },
  "Belgium":              { name: "Belgium",              flag: "🇧🇪", badgeBg: "#EF3340" },
  "Egypt":                { name: "Egypt",                flag: "🇪🇬", badgeBg: "#CE1126" },
  "Saudi Arabia":         { name: "Saudi Arabia",         flag: "🇸🇦", badgeBg: "#006C35" },
  "Uruguay":              { name: "Uruguay",              flag: "🇺🇾", badgeBg: "#5EB6E4" },
  "Iran":                 { name: "Iran",                 flag: "🇮🇷", badgeBg: "#239F40" },
  "New Zealand":          { name: "New Zealand",          flag: "🇳🇿", badgeBg: "#00247D" },
  "France":               { name: "France",               flag: "🇫🇷", badgeBg: "#002395" },
  "Senegal":              { name: "Senegal",              flag: "🇸🇳", badgeBg: "#00853F" },
  "Iraq":                 { name: "Iraq",                 flag: "🇮🇶", badgeBg: "#CE1126" },
  "Norway":               { name: "Norway",               flag: "🇳🇴", badgeBg: "#EF2B2D" },
  "Argentina":            { name: "Argentina",            flag: "🇦🇷", badgeBg: "#74ACDF" },
  "Algeria":              { name: "Algeria",              flag: "🇩🇿", badgeBg: "#006233" },
  "Austria":              { name: "Austria",              flag: "🇦🇹", badgeBg: "#ED2939" },
  "Jordan":               { name: "Jordan",               flag: "🇯🇴", badgeBg: "#007A3D" },
  "Portugal":             { name: "Portugal",             flag: "🇵🇹", badgeBg: "#006600" },
  "D.R. Congo":           { name: "D.R. Congo",           flag: "🇨🇩", badgeBg: "#007FFF" },
  "England":              { name: "England",              flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", badgeBg: "#012169" },
  "Croatia":              { name: "Croatia",              flag: "🇭🇷", badgeBg: "#CC2B2B" },
  "Ghana":                { name: "Ghana",                flag: "🇬🇭", badgeBg: "#006B3F" },
  "Panama":               { name: "Panama",               flag: "🇵🇦", badgeBg: "#DA121A" },
  "Uzbekistan":           { name: "Uzbekistan",           flag: "🇺🇿", badgeBg: "#1EB53A" },
  "Colombia":             { name: "Colombia",             flag: "🇨🇴", badgeBg: "#FCD116" },
};

// Helper: "DD.MM." + "HH:MM" → UTC timestamp (year 2026)
function toMs(date: string, time: string): number {
  const [day, month] = date.replace(".", "").split(".").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(2026, month - 1, day, hour, minute, 0);
}

// ─── Match list ──────────────────────────────────────────────────────────────
const raw: [1 | 2 | 3, string, string, string, string][] = [
  // [round, date, time, teamA, teamB]
  // Round 1
  [1, "11.06.", "19:00", "Mexico",               "South Africa"],
  [1, "12.06.", "02:00", "South Korea",           "Czech Republic"],
  [1, "12.06.", "19:00", "Canada",                "Bosnia & Herzegovina"],
  [1, "13.06.", "01:00", "USA",                   "Paraguay"],
  [1, "13.06.", "19:00", "Qatar",                 "Switzerland"],
  [1, "13.06.", "22:00", "Brazil",                "Morocco"],
  [1, "14.06.", "01:00", "Haiti",                 "Scotland"],
  [1, "14.06.", "04:00", "Australia",             "Turkey"],
  [1, "14.06.", "17:00", "Germany",               "Curacao"],
  [1, "14.06.", "20:00", "Netherlands",           "Japan"],
  [1, "14.06.", "23:00", "Ivory Coast",           "Ecuador"],
  [1, "15.06.", "02:00", "Sweden",                "Tunisia"],
  [1, "15.06.", "16:00", "Spain",                 "Cape Verde"],
  [1, "15.06.", "19:00", "Belgium",               "Egypt"],
  [1, "15.06.", "22:00", "Saudi Arabia",          "Uruguay"],
  [1, "16.06.", "01:00", "Iran",                  "New Zealand"],
  [1, "16.06.", "19:00", "France",                "Senegal"],
  [1, "16.06.", "22:00", "Iraq",                  "Norway"],
  [1, "17.06.", "01:00", "Argentina",             "Algeria"],
  [1, "17.06.", "04:00", "Austria",               "Jordan"],
  [1, "17.06.", "17:00", "Portugal",              "D.R. Congo"],
  [1, "17.06.", "20:00", "England",               "Croatia"],
  [1, "17.06.", "23:00", "Ghana",                 "Panama"],
  [1, "18.06.", "02:00", "Uzbekistan",            "Colombia"],
  // Round 2
  [2, "18.06.", "16:00", "Czech Republic",        "South Africa"],
  [2, "18.06.", "19:00", "Switzerland",           "Bosnia & Herzegovina"],
  [2, "18.06.", "22:00", "Canada",                "Qatar"],
  [2, "19.06.", "01:00", "Mexico",                "South Korea"],
  [2, "19.06.", "19:00", "USA",                   "Australia"],
  [2, "19.06.", "22:00", "Scotland",              "Morocco"],
  [2, "20.06.", "00:30", "Brazil",                "Haiti"],
  [2, "20.06.", "03:00", "Turkey",                "Paraguay"],
  [2, "20.06.", "17:00", "Netherlands",           "Sweden"],
  [2, "20.06.", "20:00", "Germany",               "Ivory Coast"],
  [2, "21.06.", "00:00", "Ecuador",               "Curacao"],
  [2, "21.06.", "04:00", "Tunisia",               "Japan"],
  [2, "21.06.", "16:00", "Spain",                 "Saudi Arabia"],
  [2, "21.06.", "19:00", "Belgium",               "Iran"],
  [2, "21.06.", "22:00", "Uruguay",               "Cape Verde"],
  [2, "22.06.", "01:00", "New Zealand",           "Egypt"],
  [2, "22.06.", "17:00", "Argentina",             "Austria"],
  [2, "22.06.", "21:00", "France",                "Iraq"],
  [2, "23.06.", "00:00", "Norway",                "Senegal"],
  [2, "23.06.", "03:00", "Jordan",                "Algeria"],
  [2, "23.06.", "17:00", "Portugal",              "Uzbekistan"],
  [2, "23.06.", "20:00", "England",               "Ghana"],
  [2, "23.06.", "23:00", "Panama",                "Croatia"],
  [2, "24.06.", "02:00", "Colombia",              "D.R. Congo"],
  // Round 3
  [3, "24.06.", "19:00", "Bosnia & Herzegovina",  "Qatar"],
  [3, "24.06.", "19:00", "Switzerland",           "Canada"],
  [3, "24.06.", "22:00", "Morocco",               "Haiti"],
  [3, "24.06.", "22:00", "Scotland",              "Brazil"],
  [3, "25.06.", "01:00", "Czech Republic",        "Mexico"],
  [3, "25.06.", "01:00", "South Africa",          "South Korea"],
  [3, "25.06.", "20:00", "Curacao",               "Ivory Coast"],
  [3, "25.06.", "20:00", "Ecuador",               "Germany"],
  [3, "25.06.", "23:00", "Japan",                 "Sweden"],
  [3, "25.06.", "23:00", "Tunisia",               "Netherlands"],
  [3, "26.06.", "02:00", "Paraguay",              "Australia"],
  [3, "26.06.", "02:00", "Turkey",                "USA"],
  [3, "26.06.", "19:00", "Norway",                "France"],
  [3, "26.06.", "19:00", "Senegal",               "Iraq"],
  [3, "27.06.", "00:00", "Cape Verde",            "Saudi Arabia"],
  [3, "27.06.", "00:00", "Uruguay",               "Spain"],
  [3, "27.06.", "03:00", "Egypt",                 "Iran"],
  [3, "27.06.", "03:00", "New Zealand",           "Belgium"],
  [3, "27.06.", "21:00", "Croatia",               "Ghana"],
  [3, "27.06.", "21:00", "Panama",                "England"],
  [3, "27.06.", "23:30", "Colombia",              "Portugal"],
  [3, "27.06.", "23:30", "D.R. Congo",            "Uzbekistan"],
  [3, "28.06.", "02:00", "Algeria",               "Austria"],
  [3, "28.06.", "02:00", "Jordan",                "Argentina"],
];

export const MATCHES: Match[] = raw.map(([round, date, time, a, b], i) => ({
  id: i + 1,
  round,
  teamA: T[a],
  teamB: T[b],
  date,
  time,
  deadlineMs: toMs(date, time),
}));

export const ROUNDS = [1, 2, 3] as const;
export type Round = (typeof ROUNDS)[number];

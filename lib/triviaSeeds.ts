export type SeedQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  timer: number;
  difficulty?: "easy" | "medium" | "hard";
};

export const TRIVIA_SEEDS: SeedQuestion[] = [
  // ── France ──────────────────────────────────────────────────────────────────
  {
    question: "How many FIFA World Cup titles has France won?",
    options: { A: "1", B: "2", C: "3", D: "4" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "In which year did France win their first FIFA World Cup?",
    options: { A: "1994", B: "1998", C: "2002", D: "2006" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who scored two headed goals for France in the 1998 World Cup Final against Brazil?",
    options: { A: "Thierry Henry", B: "David Trezeguet", C: "Zinedine Zidane", D: "Youri Djorkaeff" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who managed France to their 2018 FIFA World Cup victory in Russia?",
    options: { A: "Laurent Blanc", B: "Raymond Domenech", C: "Didier Deschamps", D: "Arsène Wenger" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who is France's all-time top international goalscorer?",
    options: { A: "Thierry Henry", B: "Michel Platini", C: "Zinedine Zidane", D: "Olivier Giroud" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "How many goals did Kylian Mbappé score in the 2022 FIFA World Cup Final against Argentina?",
    options: { A: "1", B: "2", C: "3", D: "4" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "How many total goals did Kylian Mbappé score across the 2018 and 2022 World Cups combined?",
    options: { A: "8", B: "10", C: "12", D: "14" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Zinedine Zidane was born in France to parents who emigrated from which country?",
    options: { A: "Morocco", B: "Tunisia", C: "Algeria", D: "Senegal" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "At which World Cup did Zinedine Zidane infamously headbutt Marco Materazzi in the Final?",
    options: { A: "1998", B: "2002", C: "2006", D: "2010" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which club did Kylian Mbappé join when he left Paris Saint-Germain in 2024?",
    options: { A: "Manchester City", B: "Barcelona", C: "Real Madrid", D: "Bayern Munich" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "How many goals did Just Fontaine score for France at the 1958 World Cup – still the record for most in a single tournament?",
    options: { A: "9", B: "11", C: "13", D: "15" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Who scored the Golden Goal to win Euro 2000 for France against Italy in extra time?",
    options: { A: "Thierry Henry", B: "Sylvain Wiltord", C: "Zinedine Zidane", D: "David Trezeguet" },
    correct: "D",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "How many UEFA European Championship titles has France won?",
    options: { A: "1", B: "2", C: "3", D: "4" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  // ── Spain ───────────────────────────────────────────────────────────────────
  {
    question: "How many FIFA World Cup titles has Spain won?",
    options: { A: "0", B: "1", C: "2", D: "3" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who scored Spain's winning goal in the 2010 FIFA World Cup Final?",
    options: { A: "David Villa", B: "Fernando Torres", C: "Xabi Alonso", D: "Andrés Iniesta" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which country did Spain beat in the 2010 FIFA World Cup Final?",
    options: { A: "Germany", B: "Argentina", C: "Netherlands", D: "Brazil" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "In which city was the 2010 FIFA World Cup Final between Spain and Netherlands played?",
    options: { A: "Cape Town", B: "Durban", C: "Pretoria", D: "Johannesburg" },
    correct: "D",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "How many consecutive major international tournaments did Spain win between 2008 and 2012?",
    options: { A: "1", B: "2", C: "3", D: "4" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Spain's famous short-passing, ball-possession playing style is known as what?",
    options: { A: "Catenaccio", B: "Gegenpressing", C: "Tiki-taka", D: "Total Football" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who holds the record for most international appearances (caps) for the Spanish national team?",
    options: { A: "Xavi Hernández", B: "Sergio Ramos", C: "Iker Casillas", D: "Andrés Iniesta" },
    correct: "B",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "How many UEFA European Championship titles has Spain won in total?",
    options: { A: "2", B: "3", C: "4", D: "5" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Which Spanish goalkeeper was nicknamed 'San Iker' and captained Spain to World Cup glory in 2010?",
    options: { A: "David de Gea", B: "Pepe Reina", C: "Kepa Arrizabalaga", D: "Iker Casillas" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  // ── Head-to-head & combined ─────────────────────────────────────────────────
  {
    question: "Combined, how many FIFA World Cup titles have France and Spain won between them?",
    options: { A: "2", B: "3", C: "4", D: "5" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which team knocked Spain out of the 2022 FIFA World Cup in the Round of 16?",
    options: { A: "France", B: "Croatia", C: "Morocco", D: "Portugal" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "At Euro 2012, Spain defeated France in the quarter-finals. What was the final score?",
    options: { A: "1–0", B: "2–0", C: "2–1", D: "3–1" },
    correct: "B",
    timer: 20,
    difficulty: "hard",
  },
];

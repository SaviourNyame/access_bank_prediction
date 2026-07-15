export type SeedQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  timer: number;
  difficulty?: "easy" | "medium" | "hard";
};

export const TRIVIA_SEEDS: SeedQuestion[] = [
  // ── Argentina ───────────────────────────────────────────────────────────────
  {
    question: "How many FIFA World Cup titles has Argentina won?",
    options: { A: "1", B: "2", C: "3", D: "4" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "In which three years did Argentina win the FIFA World Cup?",
    options: { A: "1974, 1982, 1998", B: "1978, 1990, 2014", C: "1978, 1986, 2022", D: "1982, 1994, 2018" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Which country did Argentina defeat in the 2022 World Cup Final?",
    options: { A: "Brazil", B: "Germany", C: "France", D: "Netherlands" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "What was the score after extra time in the 2022 World Cup Final between Argentina and France?",
    options: { A: "2–2", B: "3–3", C: "4–4", D: "1–1" },
    correct: "B",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Who scored the decisive penalty in the 2022 World Cup Final shootout to win the title for Argentina?",
    options: { A: "Lautaro Martínez", B: "Leandro Paredes", C: "Rodrigo De Paul", D: "Gonzalo Montiel" },
    correct: "D",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Who was the head coach when Argentina won the 2022 FIFA World Cup?",
    options: { A: "Jorge Sampaoli", B: "Lionel Scaloni", C: "Gerardo Martino", D: "Alejandro Sabella" },
    correct: "B",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Which country hosted the 2022 FIFA World Cup won by Argentina?",
    options: { A: "Brazil", B: "UAE", C: "Qatar", D: "Saudi Arabia" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who is Argentina's all-time top international goalscorer?",
    options: { A: "Gabriel Batistuta", B: "Diego Maradona", C: "Sergio Agüero", D: "Lionel Messi" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "How many Copa América titles has Argentina won as of 2024?",
    options: { A: "12", B: "14", C: "15", D: "16" },
    correct: "D",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "In which city was the 1978 World Cup Final held, where Argentina won their first title?",
    options: { A: "Córdoba", B: "Buenos Aires", C: "Rosario", D: "Mar del Plata" },
    correct: "B",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Which country did Argentina beat in the 1986 World Cup Final?",
    options: { A: "England", B: "Brazil", C: "West Germany", D: "Italy" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "What did Diego Maradona famously name his controversial punched goal against England in 1986?",
    options: { A: "The Phantom Goal", B: "The Hand of God", C: "God's Fist", D: "The Ghost Goal" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "How many outfield players did Maradona dribble past to score the 'Goal of the Century' in 1986?",
    options: { A: "3", B: "4", C: "5", D: "6" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "At which Spanish club did Lionel Messi win four UEFA Champions League titles?",
    options: { A: "Real Madrid", B: "Atlético Madrid", C: "Sevilla", D: "FC Barcelona" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which Argentine legend played for FC Barcelona in Spain from 1982 to 1984?",
    options: { A: "Mario Kempes", B: "Ossie Ardiles", C: "Diego Maradona", D: "Jorge Valdano" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
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
    question: "In which year did Spain win the FIFA World Cup?",
    options: { A: "2006", B: "2010", C: "2014", D: "2018" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Who scored Spain's winning goal in the 2010 World Cup Final?",
    options: { A: "David Villa", B: "Fernando Torres", C: "Xabi Alonso", D: "Andrés Iniesta" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which country did Spain beat in the 2010 World Cup Final?",
    options: { A: "Germany", B: "Argentina", C: "Netherlands", D: "Brazil" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "In which country was the 2010 FIFA World Cup held?",
    options: { A: "Brazil", B: "South Africa", C: "Germany", D: "Japan" },
    correct: "B",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "In which city was the 2010 FIFA World Cup Final played?",
    options: { A: "Cape Town", B: "Durban", C: "Pretoria", D: "Johannesburg" },
    correct: "D",
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
    question: "How many consecutive major international tournaments did Spain win between 2008 and 2012?",
    options: { A: "1", B: "2", C: "3", D: "4" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Who holds the record for most international caps for the Spanish national team?",
    options: { A: "Xavi Hernández", B: "Sergio Ramos", C: "Iker Casillas", D: "Andrés Iniesta" },
    correct: "B",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "How many UEFA European Championship titles has Spain won?",
    options: { A: "2", B: "3", C: "4", D: "5" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Which Spanish goalkeeper was nicknamed 'San Iker' and captained Spain to 2010 World Cup glory?",
    options: { A: "David de Gea", B: "Pepe Reina", C: "Kepa Arrizabalaga", D: "Iker Casillas" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which player was awarded Man of the Tournament at the 2010 FIFA World Cup?",
    options: { A: "Xavi Hernández", B: "David Villa", C: "Wesley Sneijder", D: "Andrés Iniesta" },
    correct: "D",
    timer: 20,
    difficulty: "hard",
  },
  {
    question: "Which country knocked Spain out of the 2022 FIFA World Cup in the Round of 16?",
    options: { A: "France", B: "Croatia", C: "Morocco", D: "Portugal" },
    correct: "C",
    timer: 20,
    difficulty: "hard",
  },

  // ── Argentina vs Spain & combined ───────────────────────────────────────────
  {
    question: "Combined, how many FIFA World Cup titles have Argentina and Spain won between them?",
    options: { A: "2", B: "3", C: "4", D: "5" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Which country has won more FIFA World Cup titles — Argentina or Spain?",
    options: { A: "They are equal", B: "Spain", C: "Argentina", D: "Neither has won the World Cup" },
    correct: "C",
    timer: 20,
    difficulty: "medium",
  },
  {
    question: "Lionel Messi spent most of his club career in Spain at FC Barcelona. Which city is the club based in?",
    options: { A: "Madrid", B: "Valencia", C: "Seville", D: "Barcelona" },
    correct: "D",
    timer: 20,
    difficulty: "medium",
  },
];

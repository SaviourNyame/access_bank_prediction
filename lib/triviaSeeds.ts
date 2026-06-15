export type SeedQuestion = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  timer: number;
};

export const TRIVIA_SEEDS: SeedQuestion[] = [
  // ── 2026 World Cup ──────────────────────────────────────────────────────────
  {
    question: "Which three countries are co-hosting the 2026 FIFA World Cup?",
    options: { A: "USA, Canada & Mexico", B: "USA, Brazil & Canada", C: "Mexico, Argentina & USA", D: "Canada, Spain & USA" },
    correct: "A",
    timer: 20,
  },
  {
    question: "How many teams will compete at the 2026 FIFA World Cup?",
    options: { A: "32", B: "40", C: "48", D: "36" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Which stadium will host the 2026 FIFA World Cup Final?",
    options: { A: "Rose Bowl, Los Angeles", B: "MetLife Stadium, New York/New Jersey", C: "Azteca Stadium, Mexico City", D: "AT&T Stadium, Dallas" },
    correct: "B",
    timer: 20,
  },
  {
    question: "How many matches will be played in total at the 2026 World Cup?",
    options: { A: "64", B: "80", C: "96", D: "104" },
    correct: "D",
    timer: 20,
  },
  {
    question: "How many groups will the 2026 World Cup group stage have?",
    options: { A: "8 groups", B: "10 groups", C: "12 groups", D: "16 groups" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Which city in Canada will host 2026 World Cup matches?",
    options: { A: "Toronto", B: "Vancouver", C: "Both Toronto and Vancouver", D: "Montreal" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Which Mexican city will host the opening match of the 2026 World Cup?",
    options: { A: "Guadalajara", B: "Monterrey", C: "Mexico City", D: "Tijuana" },
    correct: "C",
    timer: 20,
  },
  {
    question: "How many teams advance from each group in the 2026 World Cup group stage?",
    options: { A: "Only the top 1", B: "Top 2 plus 8 best 3rd-place teams", C: "Top 3", D: "All 4 teams" },
    correct: "B",
    timer: 20,
  },

  // ── World Cup History ────────────────────────────────────────────────────────
  {
    question: "Which country has won the FIFA World Cup the most times?",
    options: { A: "Germany", B: "Italy", C: "Brazil", D: "Argentina" },
    correct: "C",
    timer: 15,
  },
  {
    question: "How many times has Brazil won the FIFA World Cup?",
    options: { A: "4", B: "5", C: "6", D: "3" },
    correct: "B",
    timer: 15,
  },
  {
    question: "Who is the all-time top scorer in FIFA World Cup history?",
    options: { A: "Ronaldo (Brazil)", B: "Pelé", C: "Miroslav Klose", D: "Gerd Müller" },
    correct: "C",
    timer: 20,
  },
  {
    question: "How many World Cup goals did Miroslav Klose score across his career?",
    options: { A: "14", B: "15", C: "16", D: "17" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Which country hosted and won the first FIFA World Cup in 1930?",
    options: { A: "Brazil", B: "Italy", C: "Argentina", D: "Uruguay" },
    correct: "D",
    timer: 15,
  },
  {
    question: "Which country won the 2022 FIFA World Cup in Qatar?",
    options: { A: "France", B: "Brazil", C: "Argentina", D: "Morocco" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Who won the Golden Boot (top scorer) at the 2022 FIFA World Cup?",
    options: { A: "Lionel Messi", B: "Kylian Mbappé", C: "Olivier Giroud", D: "Julián Álvarez" },
    correct: "B",
    timer: 15,
  },
  {
    question: "How many goals did Kylian Mbappé score at the 2022 World Cup?",
    options: { A: "6", B: "7", C: "8", D: "9" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Who won the Golden Ball (best player) at the 2022 FIFA World Cup?",
    options: { A: "Kylian Mbappé", B: "Luka Modrić", C: "Lionel Messi", D: "Emi Martínez" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Which African team made history by reaching the 2022 World Cup semi-finals?",
    options: { A: "Senegal", B: "Ghana", C: "Cameroon", D: "Morocco" },
    correct: "D",
    timer: 15,
  },
  {
    question: "Which country won the 2018 FIFA World Cup in Russia?",
    options: { A: "Croatia", B: "France", C: "Belgium", D: "England" },
    correct: "B",
    timer: 15,
  },
  {
    question: "In which year did Germany win their 4th FIFA World Cup title?",
    options: { A: "2010", B: "2012", C: "2014", D: "2006" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Who scored the most goals in a single FIFA World Cup tournament?",
    options: { A: "Pelé (1958)", B: "Gerd Müller (1970)", C: "Just Fontaine (1958)", D: "Ronaldo (2002)" },
    correct: "C",
    timer: 20,
  },
  {
    question: "How many goals did Just Fontaine score at the 1958 World Cup?",
    options: { A: "11", B: "12", C: "13", D: "14" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Which nation has appeared in the most FIFA World Cup Finals?",
    options: { A: "Brazil", B: "Italy", C: "Argentina", D: "Germany/West Germany" },
    correct: "D",
    timer: 20,
  },
  {
    question: "Which country won the 1966 FIFA World Cup on home soil?",
    options: { A: "West Germany", B: "England", C: "Portugal", D: "USSR" },
    correct: "B",
    timer: 15,
  },
  {
    question: "Who scored the famous 'Hand of God' goal at the 1986 World Cup?",
    options: { A: "Pelé", B: "Ronaldo", C: "Diego Maradona", D: "Roberto Baggio" },
    correct: "C",
    timer: 15,
  },
  {
    question: "How old was Pelé when he won his first FIFA World Cup in 1958?",
    options: { A: "16", B: "17", C: "18", D: "19" },
    correct: "B",
    timer: 15,
  },
  {
    question: "Which African team was the first to reach the World Cup quarter-finals?",
    options: { A: "Nigeria (1994)", B: "Senegal (2002)", C: "Cameroon (1990)", D: "Ghana (2010)" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Which goalkeeper holds the record for most World Cup clean sheets?",
    options: { A: "Iker Casillas", B: "Oliver Kahn", C: "Peter Shilton", D: "Gianluigi Buffon" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Which World Cup had the highest average goals per game (5.38)?",
    options: { A: "1938 France", B: "1954 Switzerland", C: "1970 Mexico", D: "1930 Uruguay" },
    correct: "B",
    timer: 25,
  },
  {
    question: "Italy and which other country have each won 4 FIFA World Cups?",
    options: { A: "France", B: "Argentina", C: "Germany/West Germany", D: "England" },
    correct: "C",
    timer: 20,
  },
  {
    question: "In which country was the 2010 FIFA World Cup held?",
    options: { A: "Egypt", B: "Nigeria", C: "Morocco", D: "South Africa" },
    correct: "D",
    timer: 15,
  },
  {
    question: "Who won the Golden Ball at the 2014 World Cup despite his team losing in the final?",
    options: { A: "Arjen Robben", B: "Lionel Messi", C: "Thomas Müller", D: "James Rodríguez" },
    correct: "B",
    timer: 20,
  },
  {
    question: "What was the biggest upset in 2022 World Cup group stage?",
    options: { A: "Germany 2-1 Spain", B: "Saudi Arabia 2-1 Argentina", C: "Japan 2-1 Germany", D: "Morocco 2-0 Belgium" },
    correct: "B",
    timer: 20,
  },
  {
    question: "Which player has appeared in the most FIFA World Cup matches overall?",
    options: { A: "Pelé", B: "Miroslav Klose", C: "Lothar Matthäus", D: "Lionel Messi" },
    correct: "C",
    timer: 25,
  },
  {
    question: "Lionel Messi won his first World Cup title in which year?",
    options: { A: "2018", B: "2021", C: "2022", D: "2024" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Which team did Ghana beat to qualify for the 2026 World Cup?",
    options: { A: "Nigeria", B: "Comoros", C: "Angola", D: "Madagascar" },
    correct: "C",
    timer: 20,
  },

  // ── Ghana & World Cup ────────────────────────────────────────────────────────
  {
    question: "In which year did Ghana make their FIFA World Cup debut?",
    options: { A: "2002", B: "2004", C: "2006", D: "2010" },
    correct: "C",
    timer: 15,
  },
  {
    question: "What is Ghana's national football team nickname?",
    options: { A: "The Golden Eagles", B: "The Black Stars", C: "The Lions of Africa", D: "The Black Leopards" },
    correct: "B",
    timer: 15,
  },
  {
    question: "Which Ghanaian player missed the crucial penalty against Uruguay in the 2010 World Cup quarter-final?",
    options: { A: "Michael Essien", B: "Kevin-Prince Boateng", C: "André Ayew", D: "Asamoah Gyan" },
    correct: "D",
    timer: 15,
  },
  {
    question: "What controversial act did Luis Suárez commit in the last minute of the 2010 World Cup quarter-final against Ghana?",
    options: { A: "Scored an own goal", B: "Deliberately handled the ball on the goal line", C: "Fouled the goalkeeper", D: "Dived to win a penalty" },
    correct: "B",
    timer: 20,
  },
  {
    question: "Which team did Ghana beat in the Round of 16 at the 2010 FIFA World Cup?",
    options: { A: "Australia", B: "South Korea", C: "USA", D: "Serbia" },
    correct: "C",
    timer: 20,
  },
  {
    question: "How many FIFA World Cup goals has Asamoah Gyan scored, making him Africa's all-time top World Cup scorer?",
    options: { A: "4", B: "5", C: "6", D: "7" },
    correct: "C",
    timer: 20,
  },
  {
    question: "Which Ghanaian legend was named CAF African Player of the Century?",
    options: { A: "Michael Essien", B: "Tony Yeboah", C: "Asamoah Gyan", D: "Abedi Pele" },
    correct: "D",
    timer: 20,
  },
  {
    question: "How many times has Ghana qualified for the FIFA World Cup?",
    options: { A: "2", B: "3", C: "4", D: "5" },
    correct: "C",
    timer: 15,
  },
  {
    question: "Which Ghanaian player scored two goals against South Korea at the 2022 FIFA World Cup?",
    options: { A: "André Ayew", B: "Jordan Ayew", C: "Osman Bukari", D: "Mohammed Kudus" },
    correct: "D",
    timer: 15,
  },
  {
    question: "Ghana's Black Star symbol on the national flag is inspired by which organisation?",
    options: { A: "The African Union", B: "Marcus Garvey's Black Star Line", C: "The Ghana Empire", D: "The British Gold Coast colonial flag" },
    correct: "B",
    timer: 25,
  },
  {
    question: "At which World Cup did Ghana reach the quarter-finals for the first time?",
    options: { A: "2006 Germany", B: "2010 South Africa", C: "2014 Brazil", D: "2022 Qatar" },
    correct: "B",
    timer: 15,
  },
];

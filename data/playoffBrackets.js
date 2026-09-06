// Historical AVHL / USCTHL playoff brackets, standardized from the league's original bracket records.
// Historical team names and seeds are preserved exactly as used for each season.

export const playoffBrackets = [
  {
    season: "2022-23",
    format: "16-team field · division & wild-card seeding",
    champion: "Salt Lake City Scorpions",
    runnerUp: "Atlanta Cobalts",
    notes: "The inaugural playoff field used division-specific seeds plus two wild cards on each side. Series scores were not retained on the original bracket graphic.",
    west: {
      name: "West Bracket",
      rounds: [
        {
          name: "Round 1",
          games: [
            { a: { team: "Las Vegas Vipers", seed: "P1" }, b: { team: "Kansas City Metrostars", seed: "W2" }, winner: "Las Vegas Vipers" },
            { a: { team: "Seattle Dragons", seed: "P2" }, b: { team: "San Francisco Maniacs", seed: "P3" }, winner: "San Francisco Maniacs" },
            { a: { team: "Denver Mountain Lions", seed: "C1" }, b: { team: "Madison Supernovas", seed: "W1" }, winner: "Madison Supernovas" },
            { a: { team: "Salt Lake City Scorpions", seed: "C2" }, b: { team: "Lincoln Lumberjacks", seed: "C3" }, winner: "Salt Lake City Scorpions" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "Las Vegas Vipers", seed: "P1" }, b: { team: "San Francisco Maniacs", seed: "P3" }, winner: "San Francisco Maniacs" },
            { a: { team: "Madison Supernovas", seed: "W1" }, b: { team: "Salt Lake City Scorpions", seed: "C2" }, winner: "Salt Lake City Scorpions" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "San Francisco Maniacs", seed: "P3" }, b: { team: "Salt Lake City Scorpions", seed: "C2" }, winner: "Salt Lake City Scorpions" },
          ],
        },
      ],
    },
    east: {
      name: "East Bracket",
      rounds: [
        {
          name: "Round 1",
          games: [
            { a: { team: "Richmond Robbers", seed: "M1" }, b: { team: "Brooklyn Bulldogs", seed: "W2" }, winner: "Richmond Robbers" },
            { a: { team: "Baltimore Oceanics", seed: "M2" }, b: { team: "Delaware Pilots", seed: "M3" }, winner: "Delaware Pilots" },
            { a: { team: "Cleveland Demons", seed: "A1" }, b: { team: "Atlanta Cobalts", seed: "W1" }, winner: "Atlanta Cobalts" },
            { a: { team: "Jacksonville Blood Hounds", seed: "A2" }, b: { team: "Tennessee Wolverines", seed: "A3" }, winner: "Jacksonville Blood Hounds" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "Richmond Robbers", seed: "M1" }, b: { team: "Delaware Pilots", seed: "M3" }, winner: "Richmond Robbers" },
            { a: { team: "Atlanta Cobalts", seed: "W1" }, b: { team: "Jacksonville Blood Hounds", seed: "A2" }, winner: "Atlanta Cobalts" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "Richmond Robbers", seed: "M1" }, b: { team: "Atlanta Cobalts", seed: "W1" }, winner: "Atlanta Cobalts" },
          ],
        },
      ],
    },
    final: { a: { team: "Salt Lake City Scorpions", seed: "C2" }, b: { team: "Atlanta Cobalts", seed: "W1" }, winner: "Salt Lake City Scorpions" },
  },
  {
    season: "2023-24",
    format: "24-team field · 12 seeds per conference",
    champion: "New York Steamrollers",
    runnerUp: "Kansas City Metrostars",
    notes: "Seeds 5–12 opened in the qualifier round while seeds 1–4 received byes into Round 1. Qualifier series were best-of-five; the remaining rounds were best-of-seven.",
    west: {
      name: "Western Conference",
      rounds: [
        {
          name: "Qualifier",
          games: [
            { a: { team: "Lincoln Lumberjacks", seed: 8, score: 3 }, b: { team: "St. Louis Leopards", seed: 9, score: 0 }, winner: "Lincoln Lumberjacks" },
            { a: { team: "Kansas City Metrostars", seed: 5, score: 3 }, b: { team: "Arizona Heat", seed: 12, score: 2 }, winner: "Kansas City Metrostars" },
            { a: { team: "Denver Mountain Lions", seed: 6, score: 3 }, b: { team: "Washington Admirals", seed: 11, score: 0 }, winner: "Denver Mountain Lions" },
            { a: { team: "Seattle Dragons", seed: 7, score: 3 }, b: { team: "Portland Sea Lions", seed: 10, score: 2 }, winner: "Seattle Dragons" },
          ],
        },
        {
          name: "Round 1",
          games: [
            { a: { team: "Las Vegas Vipers", seed: 1, score: 4 }, b: { team: "Lincoln Lumberjacks", seed: 8, score: 3 }, winner: "Las Vegas Vipers" },
            { a: { team: "Honolulu Hawks", seed: 4, score: 0 }, b: { team: "Kansas City Metrostars", seed: 5, score: 4 }, winner: "Kansas City Metrostars" },
            { a: { team: "Montana Miners", seed: 3, score: 1 }, b: { team: "Denver Mountain Lions", seed: 6, score: 4 }, winner: "Denver Mountain Lions" },
            { a: { team: "Houston Hammerheads", seed: 2, score: 2 }, b: { team: "Seattle Dragons", seed: 7, score: 4 }, winner: "Seattle Dragons" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "Las Vegas Vipers", seed: 1, score: 2 }, b: { team: "Kansas City Metrostars", seed: 5, score: 4 }, winner: "Kansas City Metrostars" },
            { a: { team: "Denver Mountain Lions", seed: 6, score: 2 }, b: { team: "Seattle Dragons", seed: 7, score: 4 }, winner: "Seattle Dragons" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "Kansas City Metrostars", seed: 5, score: 4 }, b: { team: "Seattle Dragons", seed: 7, score: 3 }, winner: "Kansas City Metrostars" },
          ],
        },
      ],
    },
    east: {
      name: "Eastern Conference",
      rounds: [
        {
          name: "Qualifier",
          games: [
            { a: { team: "New York Steamrollers", seed: 8, score: 3 }, b: { team: "Richmond Robbers", seed: 9, score: 0 }, winner: "New York Steamrollers" },
            { a: { team: "Long Island Blizzards", seed: 5, score: 2 }, b: { team: "Pennsylvania Destroyers", seed: 12, score: 3 }, winner: "Pennsylvania Destroyers" },
            { a: { team: "Atlanta Cobalts", seed: 6, score: 3 }, b: { team: "New Orleans Whalers", seed: 11, score: 2 }, winner: "Atlanta Cobalts" },
            { a: { team: "Iowa Rebels", seed: 7, score: 2 }, b: { team: "Baltimore Oceanics", seed: 10, score: 3 }, winner: "Baltimore Oceanics" },
          ],
        },
        {
          name: "Round 1",
          games: [
            { a: { team: "Detroit Motors", seed: 1, score: 0 }, b: { team: "New York Steamrollers", seed: 8, score: 4 }, winner: "New York Steamrollers" },
            { a: { team: "Cleveland Demons", seed: 4, score: 0 }, b: { team: "Pennsylvania Destroyers", seed: 12, score: 4 }, winner: "Pennsylvania Destroyers" },
            { a: { team: "Memphis Cannons", seed: 3, score: 0 }, b: { team: "Atlanta Cobalts", seed: 6, score: 4 }, winner: "Atlanta Cobalts" },
            { a: { team: "Raleigh Wildcats", seed: 2, score: 4 }, b: { team: "Baltimore Oceanics", seed: 10, score: 2 }, winner: "Raleigh Wildcats" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "New York Steamrollers", seed: 8, score: 4 }, b: { team: "Pennsylvania Destroyers", seed: 12, score: 1 }, winner: "New York Steamrollers" },
            { a: { team: "Atlanta Cobalts", seed: 6, score: 2 }, b: { team: "Raleigh Wildcats", seed: 2, score: 4 }, winner: "Raleigh Wildcats" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "New York Steamrollers", seed: 8, score: 4 }, b: { team: "Raleigh Wildcats", seed: 2, score: 1 }, winner: "New York Steamrollers" },
          ],
        },
      ],
    },
    final: { a: { team: "Kansas City Metrostars", seed: 5, score: 3 }, b: { team: "New York Steamrollers", seed: 8, score: 4 }, winner: "New York Steamrollers" },
  },
  {
    season: "2024-25",
    format: "20-team field · 10 seeds per conference",
    champion: "Denver Mountain Lions",
    runnerUp: "Jacksonville Blood Hounds",
    notes: "Seeds 7–10 opened in the qualifier round. Seeds 1–6 entered in Round 1, with the 8/9 winner facing No. 1 and the 7/10 winner facing No. 2.",
    west: {
      name: "Western Conference",
      rounds: [
        {
          name: "Qualifier",
          games: [
            { a: { team: "Lincoln Lumberjacks", seed: 8, score: 3 }, b: { team: "Kansas City Metrostars", seed: 9, score: 2 }, winner: "Lincoln Lumberjacks" },
            { a: { team: "St. Louis Leopards", seed: 7, score: 3 }, b: { team: "Memphis Cannons", seed: 10, score: 1 }, winner: "St. Louis Leopards" },
          ],
        },
        {
          name: "Round 1",
          games: [
            { a: { team: "Denver Mountain Lions", seed: 1, score: 4 }, b: { team: "Lincoln Lumberjacks", seed: 8, score: 2 }, winner: "Denver Mountain Lions" },
            { a: { team: "Iowa Rebels", seed: 4, score: 4 }, b: { team: "Oklahoma Twisters", seed: 5, score: 3 }, winner: "Iowa Rebels" },
            { a: { team: "San Antonio Bandits", seed: 2, score: 2 }, b: { team: "St. Louis Leopards", seed: 7, score: 4 }, winner: "St. Louis Leopards" },
            { a: { team: "Portland Sea Lions", seed: 3, score: 3 }, b: { team: "Montana Miners", seed: 6, score: 4 }, winner: "Montana Miners" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "Denver Mountain Lions", seed: 1, score: 4 }, b: { team: "Iowa Rebels", seed: 4, score: 1 }, winner: "Denver Mountain Lions" },
            { a: { team: "St. Louis Leopards", seed: 7, score: 3 }, b: { team: "Montana Miners", seed: 6, score: 4 }, winner: "Montana Miners" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "Denver Mountain Lions", seed: 1, score: 4 }, b: { team: "Montana Miners", seed: 6, score: 0 }, winner: "Denver Mountain Lions" },
          ],
        },
      ],
    },
    east: {
      name: "Eastern Conference",
      rounds: [
        {
          name: "Qualifier",
          games: [
            { a: { team: "Detroit Motors", seed: 8, score: 0 }, b: { team: "Jacksonville Blood Hounds", seed: 9, score: 3 }, winner: "Jacksonville Blood Hounds" },
            { a: { team: "Raleigh Wildcats", seed: 7, score: 0 }, b: { team: "Atlanta Cobalts", seed: 10, score: 3 }, winner: "Atlanta Cobalts" },
          ],
        },
        {
          name: "Round 1",
          games: [
            { a: { team: "Cincinnati Thunderbolts", seed: 1, score: 2 }, b: { team: "Jacksonville Blood Hounds", seed: 9, score: 4 }, winner: "Jacksonville Blood Hounds" },
            { a: { team: "Chicago Rockets", seed: 4, score: 2 }, b: { team: "Cleveland Demons", seed: 5, score: 4 }, winner: "Cleveland Demons" },
            { a: { team: "Baltimore Oceanics", seed: 2, score: 4 }, b: { team: "Atlanta Cobalts", seed: 10, score: 2 }, winner: "Baltimore Oceanics" },
            { a: { team: "Pennsylvania Destroyers", seed: 3, score: 4 }, b: { team: "Charleston Tsunami", seed: 6, score: 3 }, winner: "Pennsylvania Destroyers" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "Jacksonville Blood Hounds", seed: 9, score: 4 }, b: { team: "Cleveland Demons", seed: 5, score: 2 }, winner: "Jacksonville Blood Hounds" },
            { a: { team: "Baltimore Oceanics", seed: 2, score: 4 }, b: { team: "Pennsylvania Destroyers", seed: 3, score: 1 }, winner: "Baltimore Oceanics" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "Jacksonville Blood Hounds", seed: 9, score: 4 }, b: { team: "Baltimore Oceanics", seed: 2, score: 1 }, winner: "Jacksonville Blood Hounds" },
          ],
        },
      ],
    },
    final: { a: { team: "Denver Mountain Lions", seed: 1, score: 4 }, b: { team: "Jacksonville Blood Hounds", seed: 9, score: 2 }, winner: "Denver Mountain Lions" },
  },
  {
    season: "2025-26",
    format: "20-team field · 10 seeds per conference",
    champion: "Cleveland Demons",
    runnerUp: "Montana Miners",
    notes: "The 20-team conference format returned unchanged. The original bracket preserved seeds and advancement but not series scores, so scores are intentionally omitted here.",
    west: {
      name: "Western Conference",
      rounds: [
        {
          name: "Qualifier",
          games: [
            { a: { team: "Houston Hammerheads", seed: 8 }, b: { team: "Portland Sea Lions", seed: 9 }, winner: "Houston Hammerheads" },
            { a: { team: "Lincoln Lumberjacks", seed: 7 }, b: { team: "Denver Mountain Lions", seed: 10 }, winner: "Denver Mountain Lions" },
          ],
        },
        {
          name: "Round 1",
          games: [
            { a: { team: "San Antonio Bandits", seed: 1 }, b: { team: "Houston Hammerheads", seed: 8 }, winner: "San Antonio Bandits" },
            { a: { team: "Arizona Heat", seed: 4 }, b: { team: "Memphis Cannons", seed: 5 }, winner: "Arizona Heat" },
            { a: { team: "Seattle Dragons", seed: 2 }, b: { team: "Denver Mountain Lions", seed: 10 }, winner: "Seattle Dragons" },
            { a: { team: "North Dakota Bison", seed: 3 }, b: { team: "Montana Miners", seed: 6 }, winner: "Montana Miners" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "San Antonio Bandits", seed: 1 }, b: { team: "Arizona Heat", seed: 4 }, winner: "Arizona Heat" },
            { a: { team: "Seattle Dragons", seed: 2 }, b: { team: "Montana Miners", seed: 6 }, winner: "Montana Miners" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "Arizona Heat", seed: 4 }, b: { team: "Montana Miners", seed: 6 }, winner: "Montana Miners" },
          ],
        },
      ],
    },
    east: {
      name: "Eastern Conference",
      rounds: [
        {
          name: "Qualifier",
          games: [
            { a: { team: "Indianapolis Ghosts", seed: 8 }, b: { team: "Chicago Rockets", seed: 9 }, winner: "Chicago Rockets" },
            { a: { team: "Raleigh Wildcats", seed: 7 }, b: { team: "Richmond Robbers", seed: 10 }, winner: "Raleigh Wildcats" },
          ],
        },
        {
          name: "Round 1",
          games: [
            { a: { team: "Philadelphia Destroyers", seed: 1 }, b: { team: "Chicago Rockets", seed: 9 }, winner: "Philadelphia Destroyers" },
            { a: { team: "Atlanta Cobalts", seed: 4 }, b: { team: "Florida Sunshine", seed: 5 }, winner: "Atlanta Cobalts" },
            { a: { team: "Cleveland Demons", seed: 2 }, b: { team: "Raleigh Wildcats", seed: 7 }, winner: "Cleveland Demons" },
            { a: { team: "Charleston Tsunami", seed: 3 }, b: { team: "Detroit Motors", seed: 6 }, winner: "Charleston Tsunami" },
          ],
        },
        {
          name: "Round 2",
          games: [
            { a: { team: "Philadelphia Destroyers", seed: 1 }, b: { team: "Atlanta Cobalts", seed: 4 }, winner: "Philadelphia Destroyers" },
            { a: { team: "Cleveland Demons", seed: 2 }, b: { team: "Charleston Tsunami", seed: 3 }, winner: "Cleveland Demons" },
          ],
        },
        {
          name: "Conference Final",
          games: [
            { a: { team: "Philadelphia Destroyers", seed: 1 }, b: { team: "Cleveland Demons", seed: 2 }, winner: "Cleveland Demons" },
          ],
        },
      ],
    },
    final: { a: { team: "Montana Miners", seed: 6 }, b: { team: "Cleveland Demons", seed: 2 }, winner: "Cleveland Demons" },
  },
];

export const playoffSeasons = playoffBrackets.map((bracket) => bracket.season);
export const playoffBracketBySeason = Object.fromEntries(playoffBrackets.map((bracket) => [bracket.season, bracket]));

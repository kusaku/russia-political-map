import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const raw = (year) => `https://raw.githubusercontent.com/georgytarasenko/RED-replication-package/main/data/raw_votes/${year}.csv`;
const archive = (slug) => `https://www.electoralgeography.com/new/ru/countries/r/russia/${slug}.html`;
const englishArchive = (slug) => `https://www.electoralgeography.com/new/en/countries/r/russia/${slug}.html`;
const source = "https://github.com/georgytarasenko/RED-replication-package";
const duma2026Source = "https://duma.stetsura.ru/2026/elections/russia/data.json";
const duma2026Parties = {
  'Всероссийская политическая партия "ЕДИНАЯ РОССИЯ"': "United Russia",
  "КПРФ - политическая партия КОММУНИСТИЧЕСКАЯ ПАРТИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ": "CPRF",
  "Политическая партия ЛДПР – Либерально-демократическая партия России": "LDPR",
  'Политическая партия "НОВЫЕ ЛЮДИ"': "New People",
  "Социалистическая политическая партия СПРАВЕДЛИВАЯ РОССИЯ": "A Just Russia",
  "ПАРТИЯ ПЕНСИОНЕРОВ": "Party of Pensioners",
  'Политическая партия "РОССИЙСКАЯ ПАРТИЯ ПЕНСИОНЕРОВ ЗА СОЦИАЛЬНУЮ СПРАВЕДЛИВОСТЬ"': "Party of Pensioners",
  'Политическая партия "Российская экологическая партия "ЗЕЛЁНЫЕ"': "Greens",
  "Политическая партия КОММУНИСТИЧЕСКАЯ ПАРТИЯ КОММУНИСТЫ РОССИИ": "Communists of Russia",
  'ВСЕРОССИЙСКАЯ ПОЛИТИЧЕСКАЯ ПАРТИЯ "РОДИНА"': "Rodina",
  'Политическая партия "Партия прямой демократии"': "Party of Direct Democracy"
};
const duma2026Supplements = {
  "07": { turnout: 65.33, source: "https://mirbelogorya.ru/region-news/61-belgorodskaya-oblast-news/82686-edinaya-rossiya-pobedila-na-vyborakh-k-v-gosdumu-v-belgorodskoj-oblasti.html", values: { "United Russia": 59.15, CPRF: 12.74, LDPR: 9.39, "New People": 6.70, "A Just Russia": 5.60, "Party of Pensioners": 2.74, "Communists of Russia": 1.00, Greens: 0.93, Rodina: 0.81, "Party of Direct Democracy": 0.45 } },
  "39": { source: "https://78.ru/news/2026-09-23/lenoblizbirkom-utverdil-rezultati-viborov-v-gosdumu-po-lenoblasti", values: { "United Russia": 58.25, LDPR: 11.92, CPRF: 9.40, "New People": 7.81, "A Just Russia": 5.03, Greens: 1.58, "Party of Pensioners": 1.58, "Communists of Russia": 1.30, Rodina: 0.77, "Party of Direct Democracy": 0.46 } },
  "86": { turnout: 82.14, source: "https://dnrnews.ru/politics/2026/09/24/1501178.html", values: { "United Russia": 80.46, CPRF: 5.08, "A Just Russia": 5.01, LDPR: 4.45, "New People": 2.39, Rodina: 0.49, Greens: 0.43, "Party of Pensioners": 0.39, "Communists of Russia": 0.15, "Party of Direct Democracy": 0.13 } },
  "87": { turnout: 79.33, source: "https://lnrnews.ru/society/2026/09/24/851811.html", values: { "United Russia": 78.99, "A Just Russia": 10.37, LDPR: 4.62, CPRF: 4.25, "New People": 1.31, Rodina: 0.04, "Communists of Russia": 0.04, "Party of Pensioners": 0.03, Greens: 0, "Party of Direct Democracy": 0 } },
  "88": { turnout: 80.09, source: "https://www.kommersant.ru/doc/8971707", values: { "United Russia": 79.83, "A Just Russia": 11.57, CPRF: 3.26, "New People": 2.94, LDPR: 1.73, Rodina: 0.17, Greens: 0.13, "Communists of Russia": 0.13, "Party of Direct Democracy": 0.12, "Party of Pensioners": 0.12 } },
  "89": { turnout: 74.61, source: "https://tavria.tv/news/society/izbirkom-hersonskoj-oblasti-podvel-itogi-vyborov-deputatov-gosdumy-rf/", partial: true, note: "Five named party results published; remaining 0.79% reported in aggregate", values: { "United Russia": 74.81, "A Just Russia": 13.73, CPRF: 4.70, "New People": 3.70, LDPR: 2.02 } }
};

const elections = {
  presidential: [
    [1991, "1991-06-12", "russia-presidential-election-1991", ["Bakatin", "Yeltsin", "Zhirinovsky", "Makashov", "Ryzhkov", "Tuleev"]],
    [1996, "1996-06-16", "russia-presidential-election-1996", ["Yeltsin", "Zyuganov", "Lebed", "Yavlinsky", "Zhirinovsky"]],
    [2000, "2000-03-26", null, ["Putin", "Zyuganov", "Zhirinovsky", "Yavlinsky", "Tuleev", "Titov", "Pamfilova"]],
    [2004, "2004-03-14", "russia-presidential-election-2004", ["Glazyev", "Malyshkin", "Mironov", "Putin", "Khakamada", "Kharitonov"]],
    [2008, "2008-03-02", null, ["Medvedev", "Zyuganov", "Zhirinovsky", "Bogdanov"]],
    [2012, "2012-03-04", null, ["Putin", "Zyuganov", "Prokhorov", "Mironov", "Zhirinovsky"]],
    [2018, "2018-03-18", null, ["Putin", "Grudinin", "Zhirinovsky", "Sobchak", "Yavlinsky", "Titov", "Suraykin", "Baburin"]],
    [2024, "2024-03-17", null, ["Putin", "Davankov", "Kharitonov", "Slutsky"]]
  ],
  duma: [
    [1993, "1993-12-12", "russia-legislative-election-1993", ["Agrarian Party", "Yabloko", "Russia's Choice", "DPR", "CPRF", "LDPR", "PRES", "Women of Russia", "RDDP"]],
    [1995, "1995-12-17", "russia-legislative-election-1995", ["Women of Russia", "Our Home – Russia", "Yabloko", "Democratic Choice of Russia", "CPRF", "Congress of Russian Communities", "LDPR", "Power to the People", "Communist Party of the Soviet Union", "Agrarian Party"]],
    [1999, "1999-12-19", "russia-legislative-election-1999", ["Yabloko", "Unity", "LDPR", "Fatherland – All Russia", "CPRF", "SPS"]],
    [2003, "2003-12-07", null, ["United Russia", "CPRF", "LDPR", "Rodina", "Yabloko", "SPS", "Agrarian Party", "Pensioners and Social Justice Party"]],
    [2007, "2007-12-02", null, ["United Russia", "CPRF", "LDPR", "A Just Russia", "Agrarian Party", "Yabloko", "Civic Force", "DPR", "SPS", "Patriots of Russia"]],
    [2011, "2011-12-04", null, ["United Russia", "CPRF", "LDPR", "A Just Russia", "Yabloko", "Patriots of Russia", "Right Cause"]],
    [2016, "2016-09-18", null, ["United Russia", "CPRF", "LDPR", "A Just Russia", "Yabloko", "Rodina", "Communists of Russia", "Party of Pensioners", "Greens", "Civic Platform", "PARNAS", "Party of Growth", "Patriots of Russia"]],
    [2021, "2021-09-19", null, ["United Russia", "CPRF", "LDPR", "A Just Russia", "New People", "Yabloko", "Party of Pensioners", "Communists of Russia", "Greens", "Green Alternative", "Party of Growth", "Civic Platform", "Rodina"]],
    [2026, "2026-09-20", null, ["United Russia", "CPRF", "LDPR", "New People", "A Just Russia", "Party of Pensioners", "Greens", "Communists of Russia", "Rodina", "Party of Direct Democracy"]]
  ]
};

const rawColumns = {
  2000: { region: 0, electorate: 3, valid: 11, votes: [30, 27, 26, 34, 33, 32, 28] },
  2003: { region: 0, electorate: 4, valid: 13, votes: [40, 43, 38, 36, 24, 22, 30, 23] },
  2004: { region: 0, electorate: 3, valid: 12, votes: [23, 25, 20, 24, 22, 21] },
  2007: { region: 0, electorate: 4, valid: 13, votes: [32, 26, 29, 30, 23, 33, 24, 25, 27, 31] },
  2008: { region: 0, electorate: 3, valid: 12, votes: [25, 24, 23, 22] },
  2011: { region: 0, electorate: 3, valid: 12, votes: [26, 24, 22, 21, 25, 23, 27] },
  2012: { region: 0, electorate: 3, valid: 12, votes: [25, 22, 24, 23, 21] },
  2016: { region: 0, electorate: 4, valid: 13, votes: [25, 33, 28, 35, 32, 22, 23, 24, 26, 27, 29, 30, 34] },
  2018: { region: 0, electorate: 3, valid: 12, votes: [18, 16, 17, 19, 22, 21, 20, 15] },
  2021: { region: 1, electorate: 5, valid: 14, votes: [21, 17, 19, 22, 20, 23, 30, 26, 18, 27, 28, 29, 31] },
  2024: { region: 0, electorate: 3, valid: 12, votes: [16, 18, 19, 17] }
};

const aliases = {
  "адыгея": "01", "алтай": "17", "алтайский": "02", "башкирия": "06", "башкортостан": "06", "бурятия": "09", "чечня": "10", "чувашия": "13", "чувашская чаваш республики": "13", "ленинград": "14", "ленинград спб": "14", "санкт петербург": "14", "петербург": "14", "дагестан": "16", "ингушская": "18", "кабардино балкария": "21", "карачаево черкесия": "26", "карачаево черкессия": "26", "калмыкия": "23", "марий эл": "42", "марийская": "42", "москва": "44", "московская": "45", "нижегородская": "48", "северная осетия": "49", "саха якутия": "61", "якутия": "61", "татарстан": "70", "татария": "70", "тува": "73", "удмуртия": "76", "ульяновсккая": "77", "хакассия": "30", "еврейская": "84", "ханты мансийский": "31", "ямало ненецкий": "82", "ненецкий": "47", "чукотский": "12", "тыва": "73",
  "камчатская": "25", "корякский": "25", "пермская": "56", "коми пермяцкий": "56", "читинская": "85", "агинский бурятский": "85", "таймырский": "36", "эвенкийский": "36", "усть ордынский бурятский": "19", "кемеровская": "28", "кемеровская кузбасс": "28"
};

const duma1999 = {
  "adygea": "01", "bashkortostan": "06", "buryatia": "09", "dagestan": "16", "ingushetia": "18", "kabardino balkaria": "21", "kalmykia": "23", "karachay cherkessia": "26", "karelia": "27", "komi": "33", "mari el": "42", "mordovia": "43", "north ossetia": "49", "tatarstan": "70", "tuva": "73", "udmurtia": "76", "khakassia": "30", "chuvashia": "13", "yakutia": "61",
  "krasnodar": "35", "krasnoyarsk": "36", "primorsky": "57", "stavropol": "67", "khabarovsk": "29", "amur": "03", "arkhangelsk": "04", "astrahan": "05", "belgorod": "07", "bryansk": "08", "vladimir": "78", "volgograd": "79", "vologda": "80", "voronezh": "81", "ivanovo": "20", "irkutsk": "19", "kaliningrad": "22", "kaluga": "24", "kamchatka": "25", "kemerovo": "28", "kirov": "32", "kostroma": "34", "kurgan": "37", "kursk": "38", "leningrad": "39", "lipetsk": "40", "magadan": "41", "murmansk": "46", "nizhny novgorod": "48", "novgorod": "50", "novosibirsk": "51", "omsk": "52", "orenburg": "54", "orel": "53", "penza": "55", "perm": "56", "pskov": "58", "rostov": "59", "ryazan": "60", "samara": "63", "saratov": "64", "sakhalin": "62", "sverdlovsk": "68", "smolensk": "66", "tambov": "69", "tver": "74", "tomsk": "71", "tula": "72", "tyumen": "75", "ulianovsk": "77", "chelyabinsk": "11", "chita": "85", "yaroslavl": "83", "st petersburg": "14", "jewish": "84", "nenets": "47", "khanty mansi": "31", "chukotka": "12", "yamalo nenets": "82"
};

// Published regional tables fill omissions in the two machine-readable archives.
const supplements = {
  presidential: {
    2000: {
      "10": { Putin: 50.63, Zyuganov: 22.76, Yavlinsky: 9.28, Zhirinovsky: 2.62 },
      "61": { Putin: 52.46, Zyuganov: 30.18, Yavlinsky: 4.38, Zhirinovsky: 2.98 }
    },
    2024: {
      "86": { Putin: 95.23, Kharitonov: 1.62, Davankov: 1.33, Slutsky: 1.53 },
      "87": { Putin: 94.12, Kharitonov: 1.91, Davankov: 1.39, Slutsky: 2.13 },
      "88": { Putin: 92.83, Kharitonov: 2.21, Davankov: 1.87, Slutsky: 2.52 },
      "89": { Putin: 88.12, Kharitonov: 4.88, Davankov: 2.03, Slutsky: 4.60 }
    }
  },
  duma: {
    1995: {
      "29": { "Women of Russia": 5.84, "Our Home – Russia": 6.45, Yabloko: 3.97, "Democratic Choice of Russia": 2.20, CPRF: 16.07, "Congress of Russian Communities": 3.90, LDPR: 12.25, "Power to the People": 9.56, "Communist Party of the Soviet Union": 3.91, "Agrarian Party": 0.74 },
      "40": { "Women of Russia": 2.89, "Our Home – Russia": 7.89, Yabloko: 3.34, "Democratic Choice of Russia": 4.44, CPRF: 28.96, "Congress of Russian Communities": 3.14, LDPR: 11.89, "Power to the People": 2.87, "Communist Party of the Soviet Union": 4.83, "Agrarian Party": 2.34 }
    }
  }
};

const ignored = new Set(["зарубежная территория", "98 байконур", "99 территория за пределами рф", "территория за пределами рф", "байконур"]);
const normalise = (value = "") => value.toLowerCase().replace(/ё/g, "е").replace(/\([^)]*\)/g, " ").replace(/[*,.]/g, " ").replace(/(^|\s)(?:республика|область|край|автономный округ|город федерального значения|город|г|ао)(?=\s|$)/g, "$1").replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
const number = (value) => Number(String(value ?? "").replace(/\s/g, "").replace(",", ".").replace("%", "")) || 0;
const clean = (value) => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function csvRows(text) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += char; i += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i += 1; row.push(cell); if (row.length > 1) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  return rows;
}

function subjects(meta) { return new Map(meta.map((item) => [normalise(item.localName), item.id])); }

function findSubject(name, index) {
  const key = normalise(name);
  return aliases[key] || index.get(key);
}

function results(labels, values) {
  return labels.map((party, index) => ({ party, value: Math.round(values[index] * 10) / 10 })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value || a.party.localeCompare(b.party));
}

const national = (source, turnout, labels, values, note = "Official nationwide result") => ({ source, turnout, note, results: results(labels, values) });
const nationalOverrides = {
  presidential: {
    1991: national("https://bigenc.ru/c/vybory-prezidenta-rsfsr-1991-374fa8", 74.66, ["Yeltsin", "Ryzhkov", "Zhirinovsky", "Tuleev", "Makashov", "Bakatin"], [57.30, 16.85, 7.81, 6.81, 3.74, 3.42]),
    1996: national("https://base.garant.ru/1519635/", 69.81, ["Yeltsin", "Zyuganov", "Lebed", "Yavlinsky", "Zhirinovsky", "Fedorov", "Gorbachev", "Shakkum", "Vlasov", "Bryntsalov"], [35.28, 32.03, 14.52, 7.34, 5.70, 0.92, 0.51, 0.37, 0.20, 0.16], "First-round nationwide result"),
    2000: national("https://www.prlib.ru/history/619121", 68.70, ["Putin", "Zyuganov", "Yavlinsky", "Tuleev", "Zhirinovsky", "Titov", "Pamfilova", "Govorukhin", "Skuratov", "Podberyozkin"], [52.94, 29.21, 5.80, 2.95, 2.70, 1.47, 1.01, 0.44, 0.43, 0.13]),
    2004: national("https://www.osce.org/files/f/documents/7/b/33100.pdf", 64.38, ["Putin", "Kharitonov", "Glazyev", "Khakamada", "Against all", "Malyshkin", "Mironov"], [71.31, 13.69, 4.10, 3.84, 3.45, 2.02, 0.75]),
    2008: national("https://www.interfax.ru/russia/3659", 69.81, ["Medvedev", "Zyuganov", "Zhirinovsky", "Bogdanov"], [70.28, 17.72, 9.35, 1.30]),
    2012: national("https://assembly.coe.int/nw/xml/XRef/Xref-XML2HTML-en.asp?fileid=18168&lang=en", 65.25, ["Putin", "Zyuganov", "Prokhorov", "Zhirinovsky", "Mironov"], [63.60, 17.18, 7.98, 6.22, 3.85]),
    2018: national("https://www.rcoit.ru/news/62135/", 67.54, ["Putin", "Grudinin", "Zhirinovsky", "Sobchak", "Yavlinsky", "Titov", "Suraykin", "Baburin"], [76.69, 11.77, 5.65, 1.68, 1.05, 0.76, 0.68, 0.65]),
    2024: national("https://www.rcoit.ru/upload/iblock/996/o113ka0h1graosoxp280mejmv1v0jqft/vestnik_7_2024.pdf", 77.49, ["Putin", "Kharitonov", "Davankov", "Slutsky"], [87.28, 4.31, 3.85, 3.20])
  },
  duma: {
    1993: national("https://data.ipu.org/election-summary/HTML/2263_93.htm", 54.81, ["LDPR", "Russia's Choice", "CPRF", "Women of Russia", "Agrarian Party", "Yabloko", "PRES", "DPR", "RDDP"], [22.92, 15.51, 12.40, 8.13, 7.99, 7.86, 6.79, 5.53, 4.08]),
    1995: national("https://www.csce.gov/publications/report-russian-duma-elections-december-1995/", 64.76, ["CPRF", "LDPR", "Our Home – Russia", "Yabloko", "Women of Russia", "Communists and Working Russia", "Congress of Russian Communities", "Party of Workers' Self-Government", "Democratic Choice of Russia", "Agrarian Party"], [22.30, 11.18, 10.13, 6.89, 4.61, 4.53, 4.31, 3.98, 3.86, 3.78]),
    1999: national("https://data.ipu.org/election-summary/HTML/2263_99.htm", 61.85, ["CPRF", "Unity", "Fatherland – All Russia", "SPS", "LDPR", "Yabloko"], [24.29, 23.32, 13.33, 8.52, 5.98, 5.93]),
    2003: national("https://data.ipu.org/election-summary/HTML/2263_03.htm", 55.75, ["United Russia", "CPRF", "LDPR", "Rodina", "Yabloko", "SPS", "Agrarian Party", "Pensioners and Social Justice Party"], [37.57, 12.61, 11.45, 9.02, 4.30, 3.97, 3.64, 3.09]),
    2007: national("https://data.ipu.org/election-summary/HTML/2263_07.htm", 63.78, ["United Russia", "CPRF", "LDPR", "A Just Russia", "Agrarian Party", "Yabloko", "Civic Force", "SPS", "Patriots of Russia", "DPR"], [64.30, 11.57, 8.14, 7.74, 2.30, 1.59, 1.05, 0.96, 0.89, 0.13]),
    2011: national("https://data.ipu.org/election-summary/HTML/2263_11.htm", 60.21, ["United Russia", "CPRF", "A Just Russia", "LDPR", "Yabloko", "Patriots of Russia", "Right Cause"], [49.32, 19.19, 13.24, 11.67, 3.43, 0.97, 0.60]),
    2016: national("https://data.ipu.org/parliament/RU/RU-LC01/election/RU-LC01-E20160918/", 47.88, ["United Russia", "CPRF", "LDPR", "A Just Russia", "Communists of Russia", "Yabloko", "Party of Pensioners", "Rodina", "Party of Growth", "Greens", "PARNAS", "Civic Platform", "Patriots of Russia"], [54.20, 13.34, 13.14, 6.22, 2.27, 1.99, 1.73, 1.51, 1.29, 0.76, 0.73, 0.22, 0.59]),
    2021: national("https://data.ipu.org/parliament/RU/RU-LC01/election/RU-LC01-E20210919/", 51.72, ["United Russia", "CPRF", "LDPR", "A Just Russia", "New People", "Yabloko", "Communists of Russia", "Greens", "Rodina", "Green Alternative", "Party of Growth", "Party of Pensioners", "Civic Platform"], [49.82, 18.93, 7.55, 7.46, 5.32, 1.34, 1.27, 0.91, 0.80, 0.64, 0.52, 0.49, 0.15])
  }
};

function applySupplements(type, year, states) {
  for (const [id, values] of Object.entries(supplements[type]?.[year] || {})) {
    if (!states[id]) states[id] = { turnout: null, results: results(Object.keys(values), Object.values(values)) };
  }
  return Object.fromEntries(Object.entries(states).sort(([a], [b]) => a.localeCompare(b)));
}

async function request(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function duma2026Election(meta) {
  const snapshot = JSON.parse(await request(duma2026Source));
  const index = subjects(meta), states = {}, unmatched = [];
  const voteResults = (votes) => {
    const entries = Object.entries(votes || {}).map(([key, value]) => {
      const name = duma2026Parties[snapshot.brands[key]?.name || key];
      if (!name) throw new Error(`2026: unmapped party ${snapshot.brands[key]?.name || key}`);
      return [name, Number(value) || 0];
    });
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    return results(entries.map(([name]) => name), entries.map(([, value]) => total ? value / total * 100 : 0));
  };
  for (const region of snapshot.regions) {
    const id = findSubject(region.name, index);
    if (!id) { unmatched.push(region.name); continue; }
    if (region.party_coverage !== 1 || !Object.keys(region.party_votes || {}).length) continue;
    states[id] = { turnout: null, provisional: true, results: voteResults(region.party_votes), source: duma2026Source };
  }
  for (const [id, supplement] of Object.entries(duma2026Supplements)) {
    states[id] = { ...supplement, provisional: true, results: results(Object.keys(supplement.values), Object.values(supplement.values)) };
    delete states[id].values;
  }
  if (unmatched.length) throw new Error(`2026: unmapped regions: ${unmatched.join(", ")}`);
  return {
    states: Object.fromEntries(Object.entries(states).sort(([a], [b]) => a.localeCompare(b))),
    national: {
      source: duma2026Source,
      turnout: null,
      note: "Preliminary CEC-published snapshot; federal protocol not yet signed",
      results: results(snapshot.national.parties.map((item) => duma2026Parties[item.name]), snapshot.national.parties.map((item) => item.percent))
    },
    provisional: true,
    source: duma2026Source
  };
}

async function rawElection(year, date, labels, meta) {
  if (year === 2021) return { states: JSON.parse(await readFile(resolve(root, "data/election-results.json"), "utf8")).states, national: null };
  if (year === 2026) return duma2026Election(meta);
  const spec = rawColumns[year];
  const cached = `/private/tmp/red-${year}.csv`;
  const csv = await access(cached).then(() => readFile(cached, "utf8")).catch(() => request(raw(year)));
  const rows = csvRows(csv).slice(1);
  const index = subjects(meta), unmatched = new Set();
  const sums = new Map(), national = { electorate: 0, valid: 0, votes: Array(labels.length).fill(0) };
  for (const row of rows) {
    const valid = number(row[spec.valid]);
    if (valid) {
      national.electorate += number(row[spec.electorate]); national.valid += valid;
      spec.votes.forEach((column, index) => { national.votes[index] += number(row[column]); });
    }
    const id = findSubject(row[spec.region], index);
    if (!id) { if (!ignored.has(normalise(row[spec.region]))) unmatched.add(row[spec.region]); continue; }
    const bucket = sums.get(id) || { electorate: 0, valid: 0, votes: Array(labels.length).fill(0) };
    bucket.electorate += number(row[spec.electorate]); bucket.valid += number(row[spec.valid]);
    spec.votes.forEach((column, index) => { bucket.votes[index] += number(row[column]); }); sums.set(id, bucket);
  }
  if (unmatched.size) throw new Error(`${year}: unmapped regions: ${[...unmatched].join(", ")}`);
  const states = Object.fromEntries([...sums].filter(([, value]) => value.valid && value.votes.some(Boolean)).sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => [id, {
    turnout: value.electorate ? Math.round(value.valid / value.electorate * 1000) / 10 : null,
    results: results(labels, value.votes.map((vote) => value.valid ? vote / value.valid * 100 : 0))
  }]));
  return { states, national: { turnout: national.electorate ? Math.round(national.valid / national.electorate * 1000) / 10 : null, results: results(labels, national.votes.map((vote) => national.valid ? vote / national.valid * 100 : 0)) } };
}

function tableRows(html) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => [...match[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => clean(cell[1]))).filter((row) => row.length > 1);
}

async function historicElection(year, date, slug, labels, meta) {
  const isDuma1999 = year === 1999 && slug === "russia-legislative-election-1999";
  const rows = tableRows(await request(isDuma1999 ? englishArchive(slug) : archive(slug)));
  const index = subjects(meta);
  const states = {};
  const repeated = { altai: ["17", "02"], moscow: ["45", "44"] };
  for (const row of rows) {
    const key = normalise(row[0]);
    const id = isDuma1999 ? repeated[key]?.shift() || duma1999[key] : findSubject(row[0], index);
    const start = isDuma1999 ? 2 : 1;
    if (!id || states[id] || row.length < start + labels.length) continue;
    const values = row.slice(start, start + labels.length).map(number);
    if (!values.some(Boolean)) continue;
    states[id] = { turnout: isDuma1999 ? number(row[1]) : year === 1991 ? number(row[2]) : null, results: results(labels, year === 1991 ? row.slice(3, 3 + labels.length).map(number) : values) };
  }
  const total = rows.find((row) => ["итого", "total"].includes(normalise(row[0])));
  const start = isDuma1999 ? 2 : 1;
  const national = total && {
    turnout: year === 1991 ? number(total[2]) : null,
    results: results(labels, (year === 1991 ? total.slice(3, 3 + labels.length) : total.slice(start, start + labels.length)).map(number))
  };
  return { states: Object.fromEntries(Object.entries(states).sort(([a], [b]) => a.localeCompare(b))), national };
}

async function buildType(type, meta, onlyYear) {
  const output = {};
  for (const [year, date, slug, labels] of elections[type].filter(([value]) => !onlyYear || value === onlyYear)) {
    const built = slug ? await historicElection(year, date, slug, labels, meta) : await rawElection(year, date, labels, meta);
    const states = applySupplements(type, year, built.states);
    output[year] = { date, label: `${year} ${type === "duma" ? "State Duma" : "presidential"} election`, source: built.source || (year === 1999 ? englishArchive(slug) : slug ? archive(slug) : source), provisional: Boolean(built.provisional), national: nationalOverrides[type]?.[year] || built.national, states };
    console.log(`${type} ${year}: ${Object.keys(states).length} subjects`);
  }
  return output;
}

const meta = JSON.parse(await readFile(resolve(root, "data/states-meta.json"), "utf8"));
const destination = resolve(root, "data/election-history.json");
const [selectedType, selectedYear] = process.argv.slice(2);
let previous = { source, types: { presidential: {}, duma: {} } };
try { previous = JSON.parse(await readFile(destination, "utf8")); } catch {}
const types = previous.types || { presidential: {}, duma: {} };
for (const type of selectedType ? [selectedType] : Object.keys(elections)) {
  if (!elections[type]) throw new Error(`Unknown election type: ${type}`);
  Object.assign(types[type], await buildType(type, meta, selectedYear ? Number(selectedYear) : null));
}
const payload = { source, types };
const serialized = `${JSON.stringify(payload, null, 2)}\n`;
await mkdir(dirname(destination), { recursive: true });
try { if (await readFile(destination, "utf8") === serialized) process.exit(0); } catch {}
await writeFile(destination, serialized);

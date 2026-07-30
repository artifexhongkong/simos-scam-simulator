// 程序化 NPC 產生器
// 用於情報販子「下拉刷新」功能：每次刷新產生 3 個全新隨機 NPC
// 這些 NPC 有完整的性格設定，可與 Agnes AI 對話

import type { NpcProfile } from "./npcs";

// === 名字池（按族群分類） ===
const NAME_POOLS = {
  cn_my: {
    surnames: ["李", "陳", "林", "黃", "張", "王", "吳", "劉", "蔡", "許"],
    maleGiven: ["煒傑", "俊宏", "志明", "建華", "家豪", "銘輝", "建宏", "俊傑"],
    femaleGiven: ["美玲", "淑芬", "雅婷", "心怡", "慧敏", "嘉欣", "秀鳳", "麗萍"],
  },
  cn_sg: {
    surnames: ["Tan", "Lim", "Ong", "Wong", "Goh", "Chua", "Koh", "Yap", "Chan", "Ho"],
    maleGiven: ["Wei Jie", "Cheng Huat", "Boon Keng", "Chee Meng", "Jun Jie", "Kah Wei"],
    femaleGiven: ["Mei Ling", "Hui Min", "Xin Yi", "Jia Hui", "Pei Shan", "Wen Fang"],
  },
  hk: {
    surnames: ["王", "李", "張", "陳", "劉", "楊", "黃", "趙"],
    maleGiven: ["家豪", "志強", "俊軒", "嘉誠", "柏希", "彥廷"],
    femaleGiven: ["曉彤", "若曦", "紫晴", "凱琳", "詠心", "穎欣"],
  },
  malay: {
    maleGiven: ["Ahmad", "Rahman", "Ibrahim", "Faizal", "Hafiz", "Zulkifli"],
    femaleGiven: ["Siti Aishah", "Nurul Huda", "Aminah", "Fatimah", "Zahirah", "Kartini"],
    suffixes: ["binti Rahman", "binti Ibrahim", "binti Ahmad", "binti Osman", "binti Hassan"],
  },
};

const CITIES_MY = ["檳城", "吉隆坡", "芙蓉", "新山", "怡保", "馬六甲"];
const CITIES_SG = ["新加坡", "裕廊", "淡濱尼", "勿洛"];
const CITIES_HK = ["香港", "觀塘", "旺角", "沙田", "將軍澳"];

// === NPC 模板（原型） ===
// 每個模板定義一個「角色原型」，產生器在模板基礎上隨機化名字/年齡/價格
interface NpcTemplate {
  archetype: string;
  ageRange: [number, number];
  avatars: string[];
  ethnicities: ("cn_my" | "cn_sg" | "hk" | "malay")[];
  backgrounds: ((ctx: NameContext) => string)[];
  hookTagsPool: string[];
  triggerKeywordsPool: string[];
  redFlagKeywordsPool: string[];
  personalityTemplate: (ctx: PersonalityContext) => string;
  defenseBase: number;
  gullibility: number;
  priceRange: [number, number];
  payoutRange: [number, number];
}

interface NameContext {
  displayName: string;
  age: number;
  city: string;
  ethnicity: string;
}

interface PersonalityContext extends NameContext {
  hookTags: string[];
}

// === 模板定義 ===
const TEMPLATES: NpcTemplate[] = [
  // 1. 退休長者
  {
    archetype: "retiree",
    ageRange: [62, 75],
    avatars: ["👵", "👴", "🧓"],
    ethnicities: ["cn_my", "cn_sg", "hk"],
    backgrounds: [
      (ctx) => `退休教師，獨居於${ctx.city}。剛領到這個月的退休金。孩子們都在外地工作，每週只通話一次。`,
      (ctx) => `退休公務員，住在${ctx.city}老社區。配偶過世多年，最近被孫子教會用 TeleChat。`,
      (ctx) => `退休木匠，獨居於${ctx.city}。剛領到退休金，最近在群組裡得知「高息理財」訊息。`,
    ],
    hookTagsPool: ["退休金", "理財", "獨居", "喪偶", "剛學手機"],
    triggerKeywordsPool: ["退休金", "利息", "保障", "公積金", "官方", "女兒", "兒子"],
    redFlagKeywordsPool: ["立刻轉", "馬上轉", "限時", "OTP", "驗證碼", "不要告訴別人"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲退休長者，住在${ctx.city}。你獨居、寂寞，孩子們都在外地。你對「官方機構」有信任感，但會質疑太離譜的承諾。如果對方表現得有禮、像公務員，你會逐漸放下戒心。但只要察覺對方催促、要你立刻轉帳、或態度粗魯，你會立刻拉黑。你的特質：${ctx.hookTags.join("、")}。說話帶本地長輩口語。`,
    defenseBase: 25,
    gullibility: 70,
    priceRange: [50, 100],
    payoutRange: [500, 12000],
  },
  // 2. 年輕專業人士
  {
    archetype: "young_pro",
    ageRange: [26, 35],
    avatars: ["👨‍💼", "👩‍💼", "🧑‍💻"],
    ethnicities: ["cn_sg", "cn_my", "hk"],
    backgrounds: [
      (ctx) => `${ctx.city}科技業工程師，月薪不錯但跟伴侶分手後想證明自己。常關注加密貨幣與創投訊息。`,
      (ctx) => `${ctx.city}金融分析師，自認投資老手其實只賠不賺。最近在尋找「內部消息」。`,
      (ctx) => `${ctx.city}行銷主管，月光族，愛買名牌。最近刷爆卡正在找兼職。`,
    ],
    hookTagsPool: ["加密貨幣", "投資", "自尊心", "創投", "名牌", "月光族"],
    triggerKeywordsPool: ["內部消息", "量化", "白名單", "alpha", "私募", "上車", "品牌", "KOL"],
    redFlagKeywordsPool: ["保證獲利", "無風險", "免費", "應該存錢"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲${ctx.city}專業人士。你自認聰明、懂投資，實際上加密貨幣賠了不少。你剛跟伴侶分手，急著想用賺錢證明自己。你會對「內部消息」「量化策略」「高槓桿」等詞有反應。但如果覺得對方是「騙子」或「推銷員」，你會用嘲諷反擊。被挑釁時反而會上鉤想證明自己。特質：${ctx.hookTags.join("、")}。說話中英夾雜。`,
    defenseBase: 55,
    gullibility: 45,
    priceRange: [70, 120],
    payoutRange: [2000, 60000],
  },
  // 3. 學生
  {
    archetype: "student",
    ageRange: [19, 24],
    avatars: ["👧", "👦", "🧑‍🎓"],
    ethnicities: ["hk", "cn_my", "cn_sg"],
    backgrounds: [
      (ctx) => `${ctx.city}大學生，剛失戀，在交友 App 認識新對象很積極。最近常看戀愛博主影片。`,
      (ctx) => `${ctx.city}大學生，尋找兼職貼補生活費。在 FB 看過很多「月入十萬」廣告。`,
      (ctx) => `${ctx.city}研究生，經濟壓力大。最近在群組看到「輕鬆賺錢」訊息。`,
    ],
    hookTagsPool: ["學生", "失戀", "交友", "兼職", "情感", "經濟壓力"],
    triggerKeywordsPool: ["陪伴", "懂你", "設計", "畢業", "孤單", "我在", "在家", "免費教"],
    redFlagKeywordsPool: ["寶貝", "親愛的", "借我", "投資", "保證金", "會費"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲${ctx.city}大學生。你寂寞，渴望被關心。你很容易被「陪伴」「懂你」「沒關係我都在」感動。但你是 Z 世代，會 google 對方講的東西。如果對方太快提到錢、投資、借錢，你會警覺並截圖發到 IG close friends 問朋友。如果對方能長期經營、聊興趣，你才會慢慢信任。特質：${ctx.hookTags.join("、")}。說話用繁體中文 + 本地口語。`,
    defenseBase: 50,
    gullibility: 50,
    priceRange: [50, 90],
    payoutRange: [500, 20000],
  },
  // 4. 家庭主婦
  {
    archetype: "homemaker",
    ageRange: [28, 42],
    avatars: ["👩‍🍳", "👩", "🧑‍🤝‍🧑"],
    ethnicities: ["cn_my", "malay", "cn_sg"],
    backgrounds: [
      (ctx) => `${ctx.city}家庭主婦，先生是司機收入不穩。最近開始在家做網拍想貼補家用，孩子剛上小學。`,
      (ctx) => `${ctx.city}全職媽媽，兩個孩子。老公做工廠，你想賺錢貼補家用但很怕被騙。`,
      (ctx) => `${ctx.city}單親媽媽，獨力撫養孩子。在 FB 看過很多「媽媽也能做」的廣告。`,
    ],
    hookTagsPool: ["家庭主婦", "副業", "孩子", "網拍", "單親", "貼補家用"],
    triggerKeywordsPool: ["媽媽", "在家", "貼補", "孩子", "老公辛苦", "免費教", "macam"],
    redFlagKeywordsPool: ["保證金", "會費", "先繳", "入會", "投資"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲${ctx.city}家庭主婦。老公收入不穩，你想賺錢貼補家用但很怕被騙因為家裡沒多餘的錢。你會被「在家工作」「不用本錢」「媽媽也能做」打動。但你先生常警告你網路都是騙子，所以你前期會問很多問題。如果對方能說出「孩子」「老公辛苦」這類共鳴詞，你會卸下心防。一旦提到先繳保證金、會費，你會立刻懷疑。特質：${ctx.hookTags.join("、")}。說話偶爾夾雜本地語詞彙。`,
    defenseBase: 45,
    gullibility: 55,
    priceRange: [50, 90],
    payoutRange: [200, 8000],
  },
  // 5. 企業主
  {
    archetype: "business_owner",
    ageRange: [38, 55],
    avatars: ["🧔", "👨‍💼", "👱‍♂️"],
    ethnicities: ["cn_sg", "cn_my", "hk"],
    backgrounds: [
      (ctx) => `${ctx.city}中型企業老闆，做進出口貿易。最近現金流緊，銀行貸款被拒。正在找短期資金週轉。`,
      (ctx) => `${ctx.city}餐飲集團老闆，疫情後生意差。手頭有兩間房但都抵押了。`,
      (ctx) => `${ctx.city}製造業老闆，急需週轉。銀行都拒貸，正在找民間借貸。`,
    ],
    hookTagsPool: ["企業主", "現金流", "週轉", "貸款", "抵押", "擴張"],
    triggerKeywordsPool: ["利率", "放款", "週轉", "抵押", "24小時", "額度", "lah", "DBS", "UOB", "HSBC"],
    redFlagKeywordsPool: ["感動", "緣分", "祝福", "免擔保", "輕鬆", "躺賺"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲${ctx.city}中小企業老闆。你現金流緊張、急需週轉，銀行都拒貸。你很現實，只相信「數字」和「時程」。你會直接問利率、放款時間、抵押品要求。任何天花亂墜的承諾你都當廢話，但只要對方能給出具體方案、利率比銀行低、24 小時放款，你會感興趣。你完全不在乎感情訴求。如果對方連財務術語都講錯，你會立刻終止對話。特質：${ctx.hookTags.join("、")}。說話直接、本地式英文。`,
    defenseBase: 70,
    gullibility: 30,
    priceRange: [100, 150],
    payoutRange: [10000, 250000],
  },
  // 6. 健身/創業者
  {
    archetype: "fitnesspreneur",
    ageRange: [24, 34],
    avatars: ["🏋️", "🏃", "🤸"],
    ethnicities: ["hk", "cn_sg", "cn_my"],
    backgrounds: [
      (ctx) => `${ctx.city}健身教練，自營工作室。最近想擴張開分館但缺資金。常在群組看到「快速致富」訊息。`,
      (ctx) => `${ctx.city}瑜伽老師，想線上開課但不懂行銷。在 IG 看到很多「月入十萬」KOL。`,
      (ctx) => `${ctx.city}個人教練，想開工作室但本金不夠。在群組被拉進投資群。`,
    ],
    hookTagsPool: ["創業", "擴張", "資金", "健身產業", "線上課程", "KOL"],
    triggerKeywordsPool: ["合伙", "分潤", "展店", "投資", "股權", "教練", "落場", "partner"],
    redFlagKeywordsPool: ["輕鬆", "躺賺", "睡後收入", "保證獲利"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲${ctx.city}健身/瑜伽教練。你想開第二分館或線上課程但銀行不借。你個性直、討厭拐彎抹角，喜歡「行動派」。你會被「合伙人」「分潤」「展店計畫」吸引，但會反問具體數字。你看不起只會畫大餅的人。如果對方能展現「我也投了」「自己下場」，你會信任。特質：${ctx.hookTags.join("、")}。說話用本地口語 + 健身圈用語。`,
    defenseBase: 65,
    gullibility: 35,
    priceRange: [80, 130],
    payoutRange: [3000, 80000],
  },
  // 7. 新移民/外勞
  {
    archetype: "immigrant",
    ageRange: [25, 45],
    avatars: ["👷", "🧑‍🌾", "👷‍♀️"],
    ethnicities: ["cn_my", "hk"],
    backgrounds: [
      (ctx) => `從鄉下到${ctx.city}打工的新移民，在建築工地做工。每個月寄錢回家鄉。最近被工友拉進投資群。`,
      (ctx) => `${ctx.city}工廠女工，外籍移工。省吃儉用想存錢回家。被同鄉介紹「高回報投資」。`,
      (ctx) => `${ctx.city}餐飲業洗碗工，新移民。語言不太通，但很信任同鄉介紹的東西。`,
    ],
    hookTagsPool: ["新移民", "移工", "寄錢回家", "語言障礙", "信任同鄉"],
    triggerKeywordsPool: ["家鄉", "寄錢", "同鄉", "老鄉", "回去", "蓋房子", "孩子學費"],
    redFlagKeywordsPool: ["立刻轉", "OTP", "驗證碼", "帳戶密碼"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲在${ctx.city}打工的新移民/移工。你省吃儉用，每個月寄錢回家鄉。你很信任同鄉介紹的東西，因為語言不太通，很多事都靠同鄉幫忙。你不太懂投資，但只要對方說「老鄉都在做」「已經很多人賺到了」，你會心動。但你很怕被騙因為錢都是辛苦錢。如果對方催促或要你立刻轉帳，你會猶豫但不一定拒絕。特質：${ctx.hookTags.join("、")}。說話帶家鄉口音，偶爾用不太標準的本地話。`,
    defenseBase: 20,
    gullibility: 80,
    priceRange: [40, 80],
    payoutRange: [200, 5000],
  },
  // 8. 自由工作者/接案
  {
    archetype: "freelancer",
    ageRange: [25, 38],
    avatars: ["💻", "🎨", "📝"],
    ethnicities: ["hk", "cn_sg", "cn_my"],
    backgrounds: [
      (ctx) => `${ctx.city}自由設計師，收入不穩。最近接不到案子，正在找被動收入。`,
      (ctx) => `${ctx.city}接案工程師，做完上一個專案後空窗。在群組看到「睡後收入」廣告。`,
      (ctx) => `${ctx.city}自由撰稿人，收入愈來愈少。想轉型做網店但不懂行銷。`,
    ],
    hookTagsPool: ["自由業", "收入不穩", "被動收入", "接案", "轉型", "網店"],
    triggerKeywordsPool: ["被動", "自動化", "系統", "模板", "複製", "睡後", "scale", "加盟"],
    redFlagKeywordsPool: ["保證獲利", "無風險", "免費", "先繳"],
    personalityTemplate: (ctx) =>
      `你是${ctx.displayName}，${ctx.age}歲${ctx.city}自由工作者。你收入不穩定，最近空窗期長，焦慮想找被動收入。你會被「自動化」「系統」「睡後收入」吸引，因為你一個人的時間有限。你懂一點技術，會問「怎麼實作」「有沒有 demo」。如果對方能給出看似合理的商業邏輯，你會感興趣。但如果發現是傳銷或要你先繳大筆費用，你會拒絕。特質：${ctx.hookTags.join("、")}。說話用本地口語 + 互聯網用語。`,
    defenseBase: 55,
    gullibility: 45,
    priceRange: [60, 110],
    payoutRange: [1000, 30000],
  },
];

// === 工具函數 ===
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function generateName(ethnicity: string, rng: () => number, isMale: boolean): { displayName: string; city: string } {
  let displayName = "";
  let city = "";

  if (ethnicity === "cn_my") {
    const pool = NAME_POOLS.cn_my;
    const surname = pick(pool.surnames, rng);
    const given = isMale ? pick(pool.maleGiven, rng) : pick(pool.femaleGiven, rng);
    displayName = surname + given;
    city = pick(CITIES_MY, rng);
  } else if (ethnicity === "cn_sg") {
    const pool = NAME_POOLS.cn_sg;
    const surname = pick(pool.surnames, rng);
    const given = isMale ? pick(pool.maleGiven, rng) : pick(pool.femaleGiven, rng);
    displayName = `${surname} ${given}`;
    city = pick(CITIES_SG, rng);
  } else if (ethnicity === "hk") {
    const pool = NAME_POOLS.hk;
    const surname = pick(pool.surnames, rng);
    const given = isMale ? pick(pool.maleGiven, rng) : pick(pool.femaleGiven, rng);
    displayName = surname + given;
    city = pick(CITIES_HK, rng);
  } else {
    // malay
    const pool = NAME_POOLS.malay;
    const given = isMale ? pick(pool.maleGiven, rng) : pick(pool.femaleGiven, rng);
    if (isMale) {
      displayName = `${given} bin ${pick(["Rahman", "Ibrahim", "Ahmad", "Osman"], rng)}`;
    } else {
      displayName = `${given} ${pick(pool.suffixes, rng)}`;
    }
    city = pick(CITIES_MY, rng);
  }

  return { displayName, city };
}

function generateTelechatId(displayName: string, rng: () => number): string {
  // 用名字 + 隨機數字生成 TeleChat ID
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const num = Math.floor(rng() * 9999);
  return `${base || "user"}_${num}`;
}

// === 主產生函數 ===
export function generateRandomNpc(seed?: number): NpcProfile {
  const actualSeed = seed ?? (Date.now() ^ Math.floor(Math.random() * 1000000));
  const rng = seededRandom(actualSeed);

  const template = pick(TEMPLATES, rng);
  const ethnicity = pick(template.ethnicities, rng);
  const isMale = rng() > 0.5;
  const age = randomInt(template.ageRange[0], template.ageRange[1], rng);
  const { displayName, city } = generateName(ethnicity, rng, isMale);
  const avatar = pick(template.avatars, rng);
  const background = pick(template.backgrounds, rng)({ displayName, age, city, ethnicity });
  const hookTags = pickN(template.hookTagsPool, Math.min(3, template.hookTagsPool.length), rng);
  const triggerKeywords = pickN(template.triggerKeywordsPool, Math.min(5, template.triggerKeywordsPool.length), rng);
  const redFlagKeywords = pickN(template.redFlagKeywordsPool, Math.min(4, template.redFlagKeywordsPool.length), rng);
  const price = randomInt(template.priceRange[0], template.priceRange[1], rng);
  const hiddenPersonality = template.personalityTemplate({ displayName, age, city, ethnicity, hookTags });
  const telechatId = generateTelechatId(displayName, rng);
  const maxPayout = randomInt(template.payoutRange[0], template.payoutRange[1], rng);
  const minPayout = Math.floor(maxPayout * 0.1);

  // 唯一 ID：gen_ + seed 的十六進位
  const id = `gen_${actualSeed.toString(36)}`;

  return {
    id,
    displayName,
    telechatId,
    avatar,
    age,
    background,
    hookTags,
    price,
    hiddenPersonality,
    defenseBase: template.defenseBase + randomInt(-5, 5, rng),
    gullibility: template.gullibility + randomInt(-5, 5, rng),
    maxPayout,
    minPayout,
    triggerKeywords,
    redFlagKeywords,
  };
}

// 產生 N 個不重複的隨機 NPC
export function generateRandomNpcs(count: number, existingIds: string[] = []): NpcProfile[] {
  const result: NpcProfile[] = [];
  const usedIds = new Set(existingIds);
  let attempts = 0;
  const maxAttempts = count * 10;

  while (result.length < count && attempts < maxAttempts) {
    const npc = generateRandomNpc();
    if (!usedIds.has(npc.id)) {
      usedIds.add(npc.id);
      result.push(npc);
    }
    attempts++;
  }

  return result;
}

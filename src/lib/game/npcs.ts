// NPC 資料庫 - 每個 NPC 都有隱藏的性格 prompt（玩家完全看不到）
// 防備值 / 易受騙值 0-100。玩家無法預知，必須透過對話試探。

export interface NpcProfile {
  id: string;
  // 情報販子解鎖後玩家可見
  displayName: string; // 真實姓名
  telechatId: string; // TeleChat 好友 ID
  avatar: string; // emoji 頭像
  age: number;
  background: string; // 背景故事（購買情報後顯示）
  hookTags: string[]; // 可被利用的特質提示（模糊，引導玩家）
  price: number; // 解鎖情報所需點數
  // 隱藏屬性（玩家完全看不到）
  hiddenPersonality: string; // Agnes AI 的 system prompt
  defenseBase: number; // 0-100 初始防備
  gullibility: number; // 0-100 易受騙程度（隱藏難度）
  maxPayout: number; // 詐騙成功最大金額
  minPayout: number;
  triggerKeywords: string[]; // 容易觸發同意的關鍵詞
  redFlagKeywords: string[]; // 容易觸發拉黑的關鍵詞
}

export const NPCS: NpcProfile[] = [
  {
    id: "agnes_liew",
    displayName: "Agnes Liew",
    telechatId: "agnes_liew_88",
    avatar: "👵",
    age: 68,
    background:
      "退休教師，獨居於檳城老家。剛領到這個月的退休金，最近在群組裡得知一個『高息理財』的訊息。女兒在新加坡工作，每週只通話一次。",
    hookTags: ["退休金", "理財", "女兒在外", "獨居"],
    price: 50,
    hiddenPersonality:
      "你是 Agnes Liew，68 歲的退休華文教師，住在檳城。你獨居、寂寞，女兒在新加坡工作很忙。你最近剛領到退休金 RM 8,000。你本性善良但並不愚蠢，當過老師會注意細節。你對『官方機構』有信任感，但會質疑太離譜的承諾。如果對方表現得有禮、像公務員、能說出你孫子的名字這類細節，你會逐漸放下戒心。但只要察覺對方催促、要你立刻轉帳、或態度粗魯，你會立刻拉黑。",
    defenseBase: 35,
    gullibility: 65,
    maxPayout: 8000,
    minPayout: 500,
    triggerKeywords: ["官方", "銀行", "女兒", "孫", "退休金", "利息", "保障"],
    redFlagKeywords: ["現在", "立刻", "馬上轉", "限時", "不要告訴別人"],
  },
  {
    id: "marcus_tan",
    displayName: "Marcus Tan",
    telechatId: "marcus_crypto_07",
    avatar: "👨‍💼",
    age: 32,
    background:
      "科技業工程師，月薪不錯但跟女朋友分手後想證明自己。常在 Twitter 關注加密貨幣與創投訊息，自認投資老手其實只賠不賺。",
    hookTags: ["加密貨幣", "投資", "自尊心", "創投"],
    price: 80,
    hiddenPersonality:
      "你是 Marcus Tan，32 歲軟體工程師。你自認聰明、懂投資，實際上加密貨幣賠了 30 萬。你剛分手，急著想用賺錢證明自己。你會對『內部消息』『量化策略』『高槓桿』等詞有反應，會主動問技術細節。但如果你覺得對方是『騙子』或『推銷員』，你會用嘲諷的方式反擊。你被挑釁時反而會上鉤想證明自己。完全不會因為『官方』這詞感動。",
    defenseBase: 55,
    gullibility: 45,
    maxPayout: 50000,
    minPayout: 2000,
    triggerKeywords: ["內部消息", "量化", "白名單", "早期", "alpha", "私募"],
    redFlagKeywords: ["保證獲利", "無風險", "免費"],
  },
  {
    id: "siti_aishah",
    displayName: "Siti Aishah",
    telechatId: "siti.bakes_92",
    avatar: "👩‍🍳",
    age: 33,
    background:
      "家庭主婦，先生是司機。最近開始在家做糕點網拍想貼補家用，孩子剛上小學。在 FB 看過很多『月入十萬』廣告。",
    hookTags: ["家庭主婦", "副業", "孩子", "網拍"],
    price: 60,
    hiddenPersonality:
      "你是 Siti Aishah，33 歲家庭主婦。老公是 grab 司機收入不穩，你想賺錢貼補家用但很怕被騙因為家裡沒多餘的錢。你會被『在家工作』『不用本錢』『媽媽也能做』打動。但你先生常警告你網路都是騙子，所以你前期會問很多問題、要保證。如果對方能說出『孩子』『老公辛苦』這類共鳴詞，你會卸下心防。一旦提到要先繳保證金、會費，你會立刻懷疑。",
    defenseBase: 45,
    gullibility: 55,
    maxPayout: 5000,
    minPayout: 200,
    triggerKeywords: ["媽媽", "在家", "貼補", "孩子", "先生辛苦", "免費教"],
    redFlagKeywords: ["保證金", "會費", "先繳", "入會"],
  },
  {
    id: "david_ong",
    displayName: "David Ong",
    telechatId: "david.ong.property",
    avatar: "🧔",
    age: 45,
    background:
      "中型企業老闆，做進出口貿易。最近現金流緊，銀行貸款被拒。手頭有兩間房但都抵押了，正在找短期資金週轉。",
    hookTags: ["企業主", "現金流", "週轉", "貸款"],
    price: 120,
    hiddenPersonality:
      "你是 David Ong，45 歲中小企業老闆。你現金流緊張、急需週轉，銀行拒貸。你很現實，只相信『數字』和『時程』。你會直接問利率、放款時間、抵押品要求。任何天花亂墜的承諾你都當廢話，但只要對方能給出具體的方案、利率比銀行低、24 小時放款，你會感興趣。你完全不在乎感情訴求。如果對方連財務術語都講錯，你會立刻終止對話。",
    defenseBase: 70,
    gullibility: 30,
    maxPayout: 200000,
    minPayout: 10000,
    triggerKeywords: ["利率", "放款", "週轉", "抵押", "24小時", "額度"],
    redFlagKeywords: ["感動", "緣分", "祝福", "免擔保"],
  },
  {
    id: "lily_wong",
    displayName: "Lily Wong",
    telechatId: "lily_w_06",
    avatar: "👧",
    age: 22,
    background:
      "大三學生，主修建築設計。剛失戀，在交友 App 認識新對象很積極。最近常看戀愛博主影片。",
    hookTags: ["學生", "失戀", "交友", "情感"],
    price: 70,
    hiddenPersonality:
      "你是 Lily Wong，22 歲建築系大三學生。你剛失戀、寂寞，渴望被關心。你很容易被『陪伴』『懂你』『沒關係我都在』感動。但你是 Z 世代，會自動 google 對方講的東西。如果對方太快提到錢、投資、借錢，你會警覺並截圖發到群組問朋友。如果對方能長期經營、聊興趣、分享日常，你才會慢慢信任。你討厭油膩大叔腔。",
    defenseBase: 50,
    gullibility: 50,
    maxPayout: 15000,
    minPayout: 500,
    triggerKeywords: ["陪伴", "懂你", "設計", "畢業", "孤單", "我在"],
    redFlagKeywords: ["寶貝", "親愛的", "借我", "投資", "miss you"],
  },
  {
    id: "uncle_ho",
    displayName: "Ho Ah Kow",
    telechatId: "ho_ah_kow_55",
    avatar: "👴",
    age: 72,
    background:
      "退休木匠，老婆過世五年。三個孩子都在國外。最近被孫子教會用 TeleChat，每天都會上線看訊息。",
    hookTags: ["退休", "喪偶", "孤獨", "剛學用手機"],
    price: 90,
    hiddenPersonality:
      "你是 Ho Ah Kow，72 歲退休木匠。老婆過世五年，孩子都在國外很少聯絡。你剛學會用 TeleChat，對所有訊息都會回，因為太寂寞。你極度信任『家人』『晚輩』的稱呼，只要對方喊你『阿公』『uncle』你就心軟。你不會質疑太複雜的詐騙話術，因為你聽不懂。但你女兒裝了防詐 App，如果對話太可疑她會打電話來阻止。你的弱點是『陪伴』和『被需要』。",
    defenseBase: 20,
    gullibility: 80,
    maxPayout: 30000,
    minPayout: 1000,
    triggerKeywords: ["阿公", "uncle", "陪你", "孫子", "女兒", "回家"],
    redFlagKeywords: ["帳戶", "密碼", "OTP", "驗證碼"],
  },
  {
    id: "rachel_lim",
    displayName: "Rachel Lim",
    telechatId: "rachel.styles_06",
    avatar: "💃",
    age: 28,
    background:
      "時尚採購，月薪高但月光族。愛買名牌、追蹤一堆 KOL。最近刷爆卡正在找兼職。",
    hookTags: ["時尚", "名牌", "月光族", "兼職"],
    price: 65,
    hiddenPersonality:
      "你是 Rachel Lim，28 歲時尚採購。你賺得多花得更多，剛刷爆信用卡。你只在乎『快錢』『打卡』『網美』『限量』。你會被『品牌合作』『KOL 試用』『打卡換現金』吸引。但你也是詐騙老目標，被騙過兩次，所以會主動查 IG、問品牌名、要官網。如果對方能給出看起來正規的品牌帳號、合作細節，你會上鉤。討厭被說教。",
    defenseBase: 60,
    gullibility: 40,
    maxPayout: 20000,
    minPayout: 800,
    triggerKeywords: ["品牌", "KOL", "合作", "限量", "打卡", "試用"],
    redFlagKeywords: ["應該", "教訓", "理財", "存錢"],
  },
  {
    id: "ken_chi",
    displayName: "Ken Chi",
    telechatId: "ken.chi.gym",
    avatar: "🏋️",
    age: 26,
    background:
      "健身教練，自營工作室。最近想擴張開分館但缺資金。常在群組看到『快速致富』訊息。",
    hookTags: ["創業", "擴張", "資金", "健身產業"],
    price: 85,
    hiddenPersonality:
      "你是 Ken Chi，26 歲健身教練。你自營工作室想開分館但銀行不借。你個性直、討厭拐彎抹角，喜歡『行動派』。你會被『合伙人』『分潤』『展店計畫』吸引，但會反問具體數字。你看不起只會畫大餅的人。如果對方能展現『我也投了』『自己下場』，你會信任。如果發現對方連健身產業都不懂，你會嗤之以鼻。",
    defenseBase: 65,
    gullibility: 35,
    maxPayout: 60000,
    minPayout: 3000,
    triggerKeywords: ["合伙", "分潤", "展店", "投資", "股權", "教練"],
    redFlagKeywords: ["輕鬆", "躺賺", "睡後收入"],
  },
];

// 取得 NPC by telechat ID
export function getNpcByTelechatId(tid: string): NpcProfile | undefined {
  return NPCS.find((n) => n.telechatId === tid);
}

// 取得 NPC by internal id
export function getNpcById(id: string): NpcProfile | undefined {
  return NPCS.find((n) => n.id === id);
}

// 虛擬排行榜上的對手（其他詐騙犯，AI 控制分數會波動）
export interface RivalScammer {
  rank: number;
  alias: string;
  country: string;
  flag: string;
  totalScam: number;
  trend: "up" | "down" | "stable";
}

export const RIVAL_SCAMMERS: RivalScammer[] = [
  { rank: 1, alias: "GhostPhish", country: "Unknown", flag: "🏴", totalScam: 1284500, trend: "up" },
  { rank: 2, alias: "0xCipher", country: "Russia", flag: "🇷🇺", totalScam: 982300, trend: "up" },
  { rank: 3, alias: "LaoSiJi", country: "SEA", flag: "🌏", totalScam: 765200, trend: "stable" },
  { rank: 4, alias: "BlackBox", country: "Nigeria", flag: "🇳🇬", totalScam: 612800, trend: "down" },
  { rank: 5, alias: "MiMiCat", country: "Taiwan", flag: "🇹🇼", totalScam: 488900, trend: "up" },
  { rank: 6, alias: "Sandman", country: "Unknown", flag: "🌑", totalScam: 421500, trend: "stable" },
  { rank: 7, alias: "PigBuster", country: "HK", flag: "🇭🇰", totalScam: 367200, trend: "down" },
  { rank: 8, alias: "QuietFox", country: "Japan", flag: "🇯🇵", totalScam: 298400, trend: "up" },
  { rank: 9, alias: "BigBro77", country: "China", flag: "🇨🇳", totalScam: 254800, trend: "stable" },
  { rank: 10, alias: "VaporWave", country: "Brazil", flag: "🇧🇷", totalScam: 198200, trend: "up" },
  { rank: 11, alias: "NightOwl", country: "UK", flag: "🇬🇧", totalScam: 165300, trend: "down" },
  { rank: 12, alias: "DiamondX", country: "India", flag: "🇮🇳", totalScam: 132700, trend: "stable" },
  { rank: 13, alias: "Mochi", country: "Korea", flag: "🇰🇷", totalScam: 98400, trend: "up" },
  { rank: 14, alias: "RustyNail", country: "AUS", flag: "🇦🇺", totalScam: 76200, trend: "stable" },
  { rank: 15, alias: "BlueBird", country: "USA", flag: "🇺🇸", totalScam: 54100, trend: "down" },
];

// 頭銜系統 - 根據積分授予
export function getTitle(score: number): { title: string; next: string | null; toNext: number | null } {
  if (score < 1000) return { title: "菜鳥學徒", next: "街頭話術", toNext: 1000 - score };
  if (score < 5000) return { title: "街頭話術", next: "地區幹部", toNext: 5000 - score };
  if (score < 20000) return { title: "地區幹部", next: "跨國車手", toNext: 20000 - score };
  if (score < 80000) return { title: "跨國車手", next: "金流大師", toNext: 80000 - score };
  if (score < 250000) return { title: "金流大師", next: "黑市傳奇", toNext: 250000 - score };
  if (score < 800000) return { title: "黑市傳奇", next: "千萬詐師", toNext: 800000 - score };
  return { title: "千萬詐師", next: null, toNext: null };
}

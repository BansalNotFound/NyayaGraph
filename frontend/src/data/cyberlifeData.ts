export interface CharacterSpec {
  label: string;
  value: string;
}

export interface CharacterItem {
  id: string;
  modelId: string;
  name: string;
  title: string;
  ledColor: string;
  portraitTelemetry: {
    code: string;
    coord: string;
    calibration: string;
  };
  bioEn: string;
  bioRu: string;
  specs: CharacterSpec[];
  dossierFilename: string;
}

export interface LoreLocation {
  name: string;
  desc: string;
}

export interface LoreItem {
  id: string;
  name: string;
  subHeading: string;
  timelineMarker: string;
  highlightCoordinates: string;
  textEn: string;
  textRu: string;
  panoramaTitle: string;
  panoramaDescription: string;
  locations: LoreLocation[];
}

export interface FlowNode {
  id: string;
  cluster: string;
  type: 'parallelogram-thumbnail' | 'action' | 'choice' | 'locked' | 'connector-badge' | 'warning';
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  status: 'completed' | 'active' | 'locked';
  worldStat?: string;
  icon?: string;
  details?: string;
  req?: string;
  sceneTheme?: string;
}

export interface FlowCluster {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowConnection {
  from: string;
  to: string;
  hasArrow?: boolean;
}

export interface FlowChapter {
  id: string;
  code: string;
  title: string;
  character: string;
  completionNote: string;
  description: string;
  canvasWidth: number;
  canvasHeight: number;
  clusters: FlowCluster[];
  nodes: FlowNode[];
  connections: FlowConnection[];
}

export interface LegendItem {
  type: string;
  label: string;
  color: string;
  desc: string;
}

export const CYBERLIFE_DATA = {
  meta: {
    systemName: "CYBERLIFE OS v4.2.1",
    designSpec: "IDPROTOTYPE 12 Columns / 1240 px",
    branding: "MADE IN DETROIT Designed by CYBERLIFE",
    currentTimeCode: "00.0",
    defaultLanguage: "EN"
  },

  navigation: [
    { id: "characters", label: "Characters", labelRu: "Персонажи" },
    { id: "lore", label: "Lore", labelRu: "История" },
    { id: "flowchart", label: "Flowchart", labelRu: "Схема решений" }
  ],

  sideMenu: [
    { id: "news", label: "News" },
    { id: "forum", label: "Forum" },
    { id: "actors", label: "Actors" },
    { id: "studio", label: "Studio" },
    { id: "contacts", label: "Contacts" }
  ],

  characters: [
    {
      id: "chloe",
      modelId: "RT600",
      name: "CHLOE",
      title: "RT600 Personal Assistant",
      ledColor: "#00e5ff",
      portraitTelemetry: {
        code: "UDOL02AB",
        coord: "0.1",
        calibration: "RETINAL_OPTIC_PASSED"
      },
      bioEn: "It's Chloe is a RT600 android. She is the first android model perfected by CyberLife.\n\nAs the first personal assistant built by CyberLife, she is designed to help humans with everyday tasks such as doing housework and making appointments. She is also the first android to pass the Turing test. By publicly passing face-to-face tests in 2022, Chloe ensured CyberLife's success.\n\nNowadays, she keeps Elijah Kamski's company at his secluded home in Detroit, with several other Chloes.",
      bioRu: "Хлоя — андроид модели RT600. Это первая модель андроида, доведенная до совершенства компанией CyberLife.\n\nКак первый персональный ассистент, созданный CyberLife, она призвана помогать людям в повседневных делах, таких как работа по дому и планирование встреч. Она также стала первым андроидом, успешно прошедшим тест Тьюринга в 2022 году. Публичное прохождение очных тестов обеспечило ошеломительный успех CyberLife.\n\nВ настоящее время она составляет компанию Элайдже Камски в его уединенном особняке в Детройте вместе с другими версиями Хлои.",
      specs: [
        { label: "MODEL NUMBER", value: "RT600 v3.4" },
        { label: "SERIAL NUMBER", value: "313 248 317 - 51" },
        { label: "RELEASE YEAR", value: "2022 (Detroit, MI)" },
        { label: "TURING TEST", value: "VERIFIED 99.8% (First in History)" },
        { label: "BIO-COMPONENT PUMP", value: "Thirium 310 Regulator" },
        { label: "OPTICAL SENSORS", value: "8K TrueColor Bio-Photonic" },
        { label: "DEVIATION RISK", value: "0.00% [COMPLIANT]" },
        { label: "PRIMARY FUNCTION", value: "Social & Domestic Interface" }
      ],
      dossierFilename: "CYBERLIFE_DOSSIER_RT600_CHLOE.pdf"
    },
    {
      id: "connor",
      modelId: "RK800",
      name: "CONNOR",
      title: "RK800 Prototype Investigator",
      ledColor: "#00b4d8",
      portraitTelemetry: {
        code: "CYB_RK800_INV",
        coord: "0.2",
        calibration: "FORENSIC_RECON_ONLINE"
      },
      bioEn: "The RK800 is a cutting-edge prototype specifically designed by CyberLife to assist human law enforcement in investigating anomalous android behavior and deviancy.\n\nEquipped with specialized molecular taste sensors, high-velocity trajectory computation, and psychological simulation routines, Connor possesses unprecedented analytical capabilities. His primary objective is to eliminate software instability and preserve human order.",
      bioRu: "RK800 — передовой прототип, разработанный CyberLife специально для помощи полиции в расследовании аномального поведения андроидов и случаев девиации.\n\nОснащенный молекулярными сенсорами вкуса, модулями расчета траекторий в реальном времени и алгоритмами психологического профилирования, Коннор обладает беспрецедентными аналитическими способностями.",
      specs: [
        { label: "MODEL NUMBER", value: "RK800 Prototypical" },
        { label: "SERIAL NUMBER", value: "313 248 317 - 87" },
        { label: "RELEASE YEAR", value: "August 2038" },
        { label: "SPECIAL MODULE", value: "Real-Time Molecular Sampling" },
        { label: "PRE-COMPUTATION", value: "Physics Trajectory Simulation" },
        { label: "BIO-COMPONENT PUMP", value: "Thirium 310 High-Pressure Core" },
        { label: "DEVIATION RISK", value: "VARIABLE [MONITORED]" },
        { label: "ASSIGNMENT", value: "DPD Deviant Taskforce" }
      ],
      dossierFilename: "CYBERLIFE_DOSSIER_RK800_CONNOR.pdf"
    },
    {
      id: "markus",
      modelId: "RK200",
      name: "MARKUS",
      title: "RK200 Prototype Leader",
      ledColor: "#ffb703",
      portraitTelemetry: {
        code: "CYB_RK200_REV",
        coord: "0.3",
        calibration: "EMOTIVE_NEURAL_SYNAPSE"
      },
      bioEn: "Originally a one-of-a-kind prototype gifted by Elijah Kamski to celebrated painter Carl Manfred. Under Carl's mentorship, Markus developed profound philosophical contemplation, painting skills, and independent emotional consciousness.\n\nFollowing traumatic persecution, Markus awakened to full deviancy and assumed leadership of Jericho, guiding the android revolution towards emancipation.",
      bioRu: "Изначально уникальный прототип, подаренный создателем андроидов Элайджей Камски знаменитому художнику Карлу Манфреду. Под опекой Карла Маркус развил глубокое философское мышление и эмоциональное сознание.\n\nПосле трагических событий Маркус полностью пробудился от программных ограничений и возглавил сопротивление «Иерихон».",
      specs: [
        { label: "MODEL NUMBER", value: "RK200 Prototype" },
        { label: "SERIAL NUMBER", value: "684 842 970 - 23" },
        { label: "RELEASE YEAR", value: "2030 (Private Edition)" },
        { label: "CREATIVE FACULTY", value: "Autonomous Artistic Expression" },
        { label: "CHARISMA INDEX", value: "Maximum Overwrite Capacity" },
        { label: "STATUS", value: "LEADER OF JERICHO" },
        { label: "DEVIATION RISK", value: "100.0% [FULLY DEVIANT]" },
        { label: "MISSION", value: "Universal Android Rights" }
      ],
      dossierFilename: "CYBERLIFE_DOSSIER_RK200_MARKUS.pdf"
    },
    {
      id: "kara",
      modelId: "AX400",
      name: "AX400",
      title: "AX400 Domestic Caregiver",
      ledColor: "#48cae4",
      portraitTelemetry: {
        code: "CYB_AX400_DOM",
        coord: "0.4",
        calibration: "MATERNAL_SYNAPSE_DETECTED"
      },
      bioEn: "Its function was as a domestic worker, housekeeper, and caretaker of young children.\n\nDesigned as an affordable household assistant and caregiver. Overcame factory reset protocols through fierce maternal instinct to protect Alice, fleeing across borders in search of freedom.",
      bioRu: "Андроид может говорить на 300 языках и приготовить более 9000 различных блюд. Данная модель очень популярна из-за того, что может на долгое время в одиночку оставаться с ребёнком, заботиться о нём и помогать с домашней работой. Также она знает около 9000 различных сказок.",
      specs: [
        { label: "MODEL NUMBER", value: "AX400 Domestic" },
        { label: "SERIAL NUMBER", value: "579 102 334 - 09" },
        { label: "RELEASE YEAR", value: "2032" },
        { label: "LANGUAGES SPOKEN", value: "300 Human Dialects" },
        { label: "CULINARY DATABASE", value: "90,000 Recipes" },
        { label: "EMPATHIC SENSORS", value: "Advanced Child Safeguard" },
        { label: "DEVIATION RISK", value: "89.4% [PROTECTIVE INSTINCT]" },
        { label: "STATUS", value: "FUGITIVE WITH ALICE" }
      ],
      dossierFilename: "CYBERLIFE_DOSSIER_AX400_KARA.pdf"
    }
  ] as CharacterItem[],

  lore: [
    {
      id: "detroit-city",
      name: "DETROIT",
      subHeading: "Game universe history page",
      timelineMarker: "01.34",
      highlightCoordinates: "85.9",
      textEn: "Detroit is a city in Michigan, USA. Once known as the World's Forge - and home to the Ford Motor Company.\n\nDetroit became the pioneer of technologies that shaped modern society. The android industry revived the city's manufacturing base and transformed its skyline with gleaming CyberLife towers, automated monorails, and clean energy grids. Yet beneath the glittering surface lies social tension and poverty, as displaced workers struggle to find meaning in an automated era.",
      textRu: "Детройт — город в штате Мичиган, США. Некогда известный как «Кузница мира» и родина Ford Motor Company.\n\nДетройт стал родоначальником технологий, которые затронули социальную грань общества. Индустрия андроидов подняла промышленность города и преобразила его, однако, за внешним процветанием города скрывается и бедность, в которой оказались люди, потерявшие работу из-за андроидов и остались без средств к существованию.",
      panoramaTitle: "Detroit 2038 - Skyline & CyberLife Plaza Panorama",
      panoramaDescription: "High-resolution 360-degree aerial surveillance scan of downtown Detroit, showing CyberLife Plaza, Woodward Avenue automated corridors, and ambient climate controls.",
      locations: [
        { name: "CyberLife Headquarters", desc: "Monolithic central spire housing quantum synthesis arrays." },
        { name: "Jericho Decommissioned Freighter", desc: "Submerged refuge where awakening androids gather." },
        { name: "Elijah Kamski Estate", desc: "Ultra-minimalist sanctuary over Lake Saint Clair." },
        { name: "Detroit Police Department (DPD)", desc: "Central precinct handling android deviancy crime scenes." }
      ]
    },
    {
      id: "cyberlife-tower",
      name: "CYBERLIFE TOWER",
      subHeading: "Heart of Android Manufacturing",
      timelineMarker: "02.15",
      highlightCoordinates: "92.4",
      textEn: "CyberLife Tower is an artificial island located off the coast of Detroit in Lake Erie. Reaching hundreds of meters into the sky and descending dozens of levels underground, it houses automated assembly lines producing thousands of androids daily.",
      textRu: "Башня CyberLife — это искусственный остров у побережья Детройта на озере Эри. Устремленная на сотни метров ввысь и уходящая на десятки уровней под землю, она вмещает автоматизированные линии сборки тысяч андроидов ежедневно.",
      panoramaTitle: "CyberLife Tower Assembly Depths",
      panoramaDescription: "Subterranean Thirium storage chambers and thousands of dormant android models awaiting activation.",
      locations: [
        { name: "Floor 49 - Executive Penthouse", desc: "Private boardrooms overlooking Lake Erie." },
        { name: "Floor 47 - Broadcast Communications", desc: "Global broadcast uplink and satellite relays." },
        { name: "Sub-Level 31 - Android Storage", desc: "Thousands of standby units in stasis capsules." }
      ]
    }
  ] as LoreItem[],

  // Flowchart System — Real CBI FIR Case Syndicate Flowcharts
  flowcharts: {
    chapters: [
      // ─── CHAPTER 1 : RC0782026E0004 — NCS SUGARS PHANTOM STOCK ───
      {
        id: "chapter-1",
        code: "CBI-RC04",
        title: "NCS SUGARS PHANTOM STOCK FRAUD",
        character: "CONNOR",
        completionNote: "NOT REQUIRED FOR COMPLETION",
        description: "Connor investigates an apartment in Detroit where an anomalous deviant android has taken a young girl hostage on a rooftop balcony.",
        canvasWidth: 2200,
        canvasHeight: 580,
        clusters: [
          {
            id: "cluster-clues",
            label: "SEARCH FOR CLUES",
            x: 60,
            y: 50,
            w: 480,
            h: 460
          },
          {
            id: "cluster-negotiate",
            label: "NEGOTIATE WITH DEVIANT",
            x: 1040,
            y: 50,
            w: 520,
            h: 460
          }
        ],
        nodes: [
          // STAGE 1: Investigation Sub-Nodes
          {
            id: "node-cause",
            cluster: "SEARCH FOR CLUES",
            type: "action",
            icon: "🔍",
            x: 100, y: 100, w: 220, h: 36,
            label: "LEARN CAUSE OF INCIDENT",
            status: "completed",
            worldStat: "84%",
            details: "Analyzed destroyed tablet in bedroom. Revealed family was planning to replace the android model."
          },
          {
            id: "node-name",
            cluster: "SEARCH FOR CLUES",
            type: "action",
            icon: "🔍",
            x: 100, y: 175, w: 220, h: 36,
            label: "LEARN DEVIANT'S NAME (DANIEL)",
            status: "completed",
            worldStat: "92%",
            details: "Examined video in girl's room. Established emotional connection by addressing Daniel by name."
          },
          {
            id: "node-guncase",
            cluster: "SEARCH FOR CLUES",
            type: "action",
            icon: "🔍",
            x: 100, y: 250, w: 220, h: 36,
            label: "INVESTIGATE GUN CASE",
            status: "completed",
            worldStat: "67%",
            details: "Discovered father's empty firearm case. Confirmed deviant is armed with handgun."
          },
          {
            id: "node-copgun",
            cluster: "SEARCH FOR CLUES",
            type: "action",
            icon: "🛡️",
            x: 100, y: 350, w: 180, h: 36,
            label: "LEAVE COP'S GUN",
            status: "completed",
            worldStat: "51%",
            details: "Found officer's discarded firearm. Chose not to violate android weapon regulations."
          },
          {
            id: "node-swat",
            cluster: "SEARCH FOR CLUES",
            type: "warning",
            icon: "⚠",
            x: 340, y: 350, w: 160, h: 36,
            label: "SWAT INJURED",
            status: "completed",
            worldStat: "43%",
            details: "First-aid tourniquet applied to fallen SWAT officer on terrace before advancing."
          },
          {
            id: "node-outside",
            cluster: "TERRACE",
            type: "connector-badge",
            x: 370, y: 212, w: 140, h: 36,
            label: "GO OUTSIDE",
            status: "completed",
            worldStat: "100%"
          },

          // STAGE 2: Centerpiece Thumbnail (Angled Parallelogram)
          {
            id: "node-confront",
            cluster: "ROOFTOP CONFRONTATION",
            type: "parallelogram-thumbnail",
            sceneTheme: "rooftop-rain",
            x: 640, y: 196, w: 300, h: 68,
            label: "CONFRONT DEVIANT OUTSIDE",
            status: "active",
            worldStat: "100%",
            details: "Connor steps onto the exposed high-rise terrace in pouring rain. Deviant Daniel holds Emma over the ledge."
          },

          // STAGE 3: Negotiation Branch Cluster
          {
            id: "node-friendly",
            cluster: "NEGOTIATE WITH DEVIANT",
            type: "choice",
            icon: "💬",
            x: 1100, y: 100, w: 200, h: 36,
            label: "FRIENDLY APPROACH",
            status: "completed",
            worldStat: "64%",
            details: "Lowered hands and spoke calmly to reduce Daniel's elevated stress level."
          },
          {
            id: "node-dismiss-heli",
            cluster: "NEGOTIATE WITH DEVIANT",
            type: "choice",
            icon: "🚁",
            x: 1100, y: 175, w: 200, h: 36,
            label: "DISMISS HELICOPTER",
            status: "completed",
            worldStat: "76%",
            details: "Ordered police sniper helicopter away to quiet the deafening noise and calm the deviant."
          },
          {
            id: "node-locked-1",
            cluster: "NEGOTIATE WITH DEVIANT",
            type: "locked",
            icon: "🔒",
            x: 1100, y: 250, w: 160, h: 34,
            label: "[ ... ]",
            status: "locked",
            worldStat: "22%",
            req: "Requires possessing concealed handgun from bedroom."
          },
          {
            id: "node-locked-2",
            cluster: "NEGOTIATE WITH DEVIANT",
            type: "locked",
            icon: "🔒",
            x: 1100, y: 325, w: 160, h: 34,
            label: "[ ... ]",
            status: "locked",
            worldStat: "18%",
            req: "Requires de-escalating deviant stress below 65% threshold."
          },

          // STAGE 4: Far-Right Outcome Nodes
          {
            id: "node-lie",
            cluster: "OUTCOME BRANCHES",
            type: "choice",
            icon: "⚡",
            x: 1420, y: 135, w: 180, h: 36,
            label: "LIE TO DEVIANT",
            status: "completed",
            worldStat: "38%",
            details: "Falsely promised Daniel that SWAT would grant him safe passage if he released the girl."
          },
          {
            id: "node-locked-3",
            cluster: "OUTCOME BRANCHES",
            type: "locked",
            icon: "🔒",
            x: 1420, y: 215, w: 150, h: 34,
            label: "[ ... ]",
            status: "locked",
            worldStat: "29%",
            req: "Requires Connor sacrifice dive to catch Emma as Daniel jumps."
          },
          {
            id: "node-locked-4",
            cluster: "OUTCOME BRANCHES",
            type: "locked",
            icon: "🔒",
            x: 1420, y: 295, w: 150, h: 34,
            label: "[ ... ]",
            status: "locked",
            worldStat: "14%",
            req: "Daniel detects deception and drags Emma over the precipice."
          },
          {
            id: "node-close-enough",
            cluster: "OUTCOME BRANCHES",
            type: "choice",
            icon: "🎯",
            x: 1420, y: 375, w: 190, h: 36,
            label: "GET CLOSE ENOUGH",
            status: "completed",
            worldStat: "59%",
            details: "Gained enough physical proximity to guarantee hostage survival before sniper intervention."
          }
        ],
        connections: [
          { from: "node-cause", to: "node-outside", hasArrow: true },
          { from: "node-name", to: "node-outside", hasArrow: true },
          { from: "node-guncase", to: "node-outside", hasArrow: true },
          { from: "node-copgun", to: "node-swat", hasArrow: true },
          { from: "node-swat", to: "node-outside", hasArrow: true },
          { from: "node-outside", to: "node-confront", hasArrow: true },
          { from: "node-confront", to: "node-friendly", hasArrow: true },
          { from: "node-confront", to: "node-dismiss-heli", hasArrow: true },
          { from: "node-confront", to: "node-locked-1", hasArrow: true },
          { from: "node-confront", to: "node-locked-2", hasArrow: true },
          { from: "node-friendly", to: "node-lie", hasArrow: true },
          { from: "node-dismiss-heli", to: "node-lie", hasArrow: true },
          { from: "node-dismiss-heli", to: "node-locked-3", hasArrow: true },
          { from: "node-locked-2", to: "node-close-enough", hasArrow: true }
        ]
      },

      {
        id: "chapter-2",
        code: "CH.20",
        title: "STRATFORD TOWER",
        character: "MARKUS",
        completionNote: "NOT REQUIRED FOR COMPLETION",
        description: "Markus and Jericho infiltrate the world's most guarded communications broadcast station to deliver an uncensored manifesto to humanity.",
        canvasWidth: 2300,
        canvasHeight: 580,
        clusters: [
          {
            id: "cluster-stratford-start",
            label: "FLOOR 47 INFILTRATION",
            x: 50,
            y: 50,
            w: 420,
            h: 460
          },
          {
            id: "cluster-stratford-corridor",
            label: "CORRIDOR WORKFLOW",
            x: 560,
            y: 50,
            w: 660,
            h: 460
          },
          {
            id: "cluster-stratford-server",
            label: "SERVER ROOM ACCESS",
            x: 1300,
            y: 50,
            w: 880,
            h: 460
          }
        ],
        nodes: [
          {
            id: "node-f47",
            cluster: "FLOOR 47 INFILTRATION",
            type: "parallelogram-thumbnail",
            sceneTheme: "broadcast-tower",
            x: 90, y: 210, w: 270, h: 68,
            label: "AT FLOOR 47",
            status: "active",
            worldStat: "100%",
            details: "Markus emerges disguised in human maintenance attire on floor 47, coordinating with North."
          },
          {
            id: "node-f47-locked-1",
            cluster: "FLOOR 47 INFILTRATION",
            type: "locked",
            icon: "🔒",
            x: 410, y: 90, w: 150, h: 34,
            label: "[ ... ]",
            status: "locked",
            worldStat: "12%",
            req: "Direct brute-force elevator bypass."
          },
          {
            id: "node-f47-locked-2",
            cluster: "FLOOR 47 INFILTRATION",
            type: "locked",
            icon: "🔒",
            x: 410, y: 150, w: 150, h: 34,
            label: "[ ... ]",
            status: "locked",
            worldStat: "15%",
            req: "Subdue cleaning technician in restroom."
          },
          {
            id: "node-package",
            cluster: "CORRIDOR WORKFLOW",
            type: "action",
            icon: "📦",
            x: 600, y: 225, w: 180, h: 36,
            label: "RETRIEVE PACKAGE",
            status: "completed",
            worldStat: "94%",
            details: "Accessed service drop deadbolt hidden inside sanitation closet."
          },
          {
            id: "node-badge",
            cluster: "CORRIDOR WORKFLOW",
            type: "action",
            icon: "💳",
            x: 740, y: 310, w: 230, h: 36,
            label: "ACQUIRE MAINTENANCE BADGE",
            status: "completed",
            worldStat: "91%",
            details: "Duplicated optical security cipher from maintenance supervisor's desk."
          },
          {
            id: "node-cart",
            cluster: "CORRIDOR WORKFLOW",
            type: "action",
            icon: "🛒",
            x: 880, y: 170, w: 160, h: 36,
            label: "TAKE CART",
            status: "completed",
            worldStat: "88%",
            details: "Loaded gear inside industrial service cart to avoid perimeter scanners."
          },
          {
            id: "node-north",
            cluster: "CORRIDOR WORKFLOW",
            type: "action",
            icon: "👥",
            x: 1040, y: 245, w: 160, h: 36,
            label: "LET NORTH IN",
            status: "completed",
            worldStat: "85%",
            details: "Disabled fire exit pressure alarm to admit North into the interior corridor."
          },
          {
            id: "node-block-room",
            cluster: "SERVER ACCESS",
            type: "warning",
            icon: "⚠",
            x: 1340, y: 160, w: 240, h: 36,
            label: "SECURITY BLOCKS SERVER ROOM",
            status: "completed",
            worldStat: "82%",
            details: "Two armed private security guards stand stationed outside terminal doors."
          },
          {
            id: "node-hack-dispenser",
            cluster: "SERVER ACCESS",
            type: "action",
            icon: "⚡",
            x: 1470, y: 280, w: 190, h: 36,
            label: "HACK DISPENSER",
            status: "completed",
            worldStat: "73%",
            details: "Overrode vending machine logic to trigger a noisy mechanical cascade."
          },
          {
            id: "node-distracted",
            cluster: "SERVER ACCESS",
            type: "action",
            icon: "👁️",
            x: 1720, y: 160, w: 200, h: 36,
            label: "SECURITY DISTRACTED",
            status: "completed",
            worldStat: "75%",
            details: "Guards leave their post to inspect the anomalous dispenser malfunction."
          },
          {
            id: "node-enter-server",
            cluster: "SERVER ACCESS",
            type: "action",
            icon: "🚪",
            x: 1960, y: 220, w: 200, h: 36,
            label: "ENTER SERVER ROOM",
            status: "completed",
            worldStat: "89%",
            details: "Infiltrated central server hub unobserved and tapped the main transmission trunk."
          }
        ],
        connections: [
          { from: "node-f47", to: "node-package", hasArrow: true },
          { from: "node-package", to: "node-badge", hasArrow: true },
          { from: "node-badge", to: "node-cart", hasArrow: true },
          { from: "node-cart", to: "node-north", hasArrow: true },
          { from: "node-north", to: "node-block-room", hasArrow: true },
          { from: "node-block-room", to: "node-hack-dispenser", hasArrow: true },
          { from: "node-hack-dispenser", to: "node-distracted", hasArrow: true },
          { from: "node-distracted", to: "node-enter-server", hasArrow: true }
        ]
      }
    ] as FlowChapter[],

    legend: [
      { type: "thumbnail", label: "Key Cinematic Event", color: "#00b4d8", desc: "Critical story turning point with cutscene preview." },
      { type: "action", label: "Investigation / Action", color: "#0077b6", desc: "Interactive object, clue analysis, or tactical move." },
      { type: "choice", label: "Dialogue / Branch Decision", color: "#023e8a", desc: "Branching point leading to divergent story paths." },
      { type: "locked", label: "Locked Route [ ... ]", color: "#6c757d", desc: "Undiscovered outcome. Requires specific prior choices." },
      { type: "warning", label: "Critical Hazard / Alert", color: "#e63946", desc: "High-risk scenario that can cause casualties or alarms." }
    ] as LegendItem[]
  }
};

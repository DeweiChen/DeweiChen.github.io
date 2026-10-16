export type Lang = 'zh' | 'en'

export interface Role {
  title: string
  period: string
  bullets: string[]
  /** Sub-sections such as "Key Projects", rendered as titled lists. */
  groups?: { title: string; items: { name: string; detail?: string; link?: string }[] }[]
}

export interface Company {
  name: string
  roles: Role[]
}

export interface Resume {
  name: string
  altName: string
  headline: string
  location: string
  email: string
  links: { github: string; linkedin: string }
  stats: { value: string; label: string }[]
  /** Each line renders as a bold lead-in followed by the rest (which carries its own separator). */
  about: { lead: string; text: string }[]
  skills: { group: string; items: string[] }[]
  experience: Company[]
  sideProjects: { name: string; description: string; link?: string }[]
  education: { degree: string; school: string; period: string; note: string }[]
  labels: {
    about: string
    skills: string
    experience: string
    sideProjects: string
    education: string
    classic: string
    immersive: string
    hint: string
    print: string
    contact: string
    scroll: string
  }
}

// TODO(dw): fill in the real URLs from the PDF's "(Link)" entries.
const VIVEPORT_CLOUD: string | undefined = undefined
const OVOY: string | undefined = undefined

const en: Resume = {
  name: 'De-Wei Chen',
  altName: '陳德維',
  headline: 'Product Team Lead · Full-Stack Engineer',
  location: 'Taipei, Taiwan',
  email: 'iam.dw.chen@gmail.com',
  links: {
    github: 'https://github.com/DeweiChen',
    linkedin: 'https://www.linkedin.com/in/de-wei-chen-400709a7/',
  },
  stats: [
    { value: '10+', label: 'yrs Mobile' },
    { value: '7+', label: 'yrs VR / XR' },
    { value: '3+', label: 'yrs Backend' },
    { value: '87%', label: 'Cloud cost cut' },
  ],
  about: [
    { lead: 'Product Team Lead & Full-Stack Engineer', text: ' with 10+ years in mobile, 7+ years in VR, and 3+ years in backend; led cross-functional teams of up to 9 engineers.' },
    { lead: 'Top Performer:', text: ' Ranked #1 in performance out of a 70-member department at HTC within my second year.' },
    { lead: 'AI-Driven & Problem Solver:', text: ' Actively leveraging AI-assisted workflows to steer development and solve complex engineering challenges.' },
  ],
  skills: [
    { group: 'AI Agents', items: ['Claude Code', 'GitHub Copilot', 'Antigravity', 'Cursor'] },
    { group: 'Mobile', items: ['Android', 'iOS', 'Unity3D', 'Flutter', 'React Native'] },
    { group: '3D / Rendering', items: ['Unity', 'Three.js', '3D Gaussian Splatting', 'Apple Vision Pro', 'Apple RoomPlan'] },
    { group: 'Backend', items: ['Golang', 'MongoDB', 'Redis', 'Docker', 'CI/CD', 'RESTful API', 'OpenAPI'] },
    { group: 'Architecture', items: ['Clean Architecture', 'Domain-Driven Design', 'Event-Driven Systems'] },
    { group: 'Leadership', items: ['Cross-functional Leadership', 'Technical Mentoring', 'Agile / Scrum', 'Cloud Cost Optimization'] },
  ],
  experience: [
    {
      name: 'Homee AI',
      roles: [
        {
          title: 'Product Team Lead',
          period: 'May 2025 – Apr 2026',
          bullets: [
            "Led a 9-person cross-functional team spanning App, Frontend, Backend, and DevOps, owning end-to-end delivery of the company's flagship product from planning to production while integrating core platforms with AI technologies.",
            'Built a full-stack, T-shaped engineering culture and standardized Scrum practices across the department, driving adoption of AI-assisted development tools to accelerate product iteration.',
            'Architected core systems — event buses, job queues, and CPU/GPU resource allocation — reducing monthly cloud infrastructure costs by 87%.',
          ],
        },
        {
          title: 'Team Lead & Senior Software Engineer',
          period: 'Mar 2024 – May 2025',
          bullets: [
            'Led a 4-person platform team across rendering and app development, delivering a core rendering-layer SDK adopted by external partners and internal systems.',
          ],
          groups: [
            {
              title: 'Spatial Computing',
              items: [
                { name: '3D Gaussian Splatting', detail: 'Visualized interior spaces with 3DGS and rendered them with Three.js.' },
                { name: 'Omniverse cloud streaming', detail: 'Integrated Omniverse with cloud streaming for VR/AR devices, syncing workflows across Blender, 3DS Max, and Unity.' },
                { name: 'Apple RoomPlan', detail: 'Integrated RoomPlan into spatial computing applications.' },
                { name: 'Apple Vision Pro', detail: 'Developed and deployed Unity applications on Vision Pro.' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'XRSPACE',
      roles: [
        {
          title: 'Assistant Manager',
          period: 'Apr 2022 – Sep 2023',
          bullets: [
            'Technical lead for core backend systems on AWS S3, MongoDB, and Redis; standardized API docs with OpenAPI and wired them into GitLab/GitHub CI/CD for automated deployment.',
          ],
          groups: [
            {
              title: 'PartyOn — Virtual KTV & Concerts',
              items: [
                { name: 'Live Streaming', detail: 'Integrated Wowza (HLS/WebRTC) for low-latency video at large-scale virtual events.' },
                { name: 'Real-time Audio', detail: 'Deployed Jamulus for multiplayer jam sessions with sub-20ms latency.' },
                { name: 'Multiplayer Backend', detail: 'Built and scaled game and account servers for real-time room sync (PUN) and high-availability auth.' },
              ],
            },
          ],
        },
        {
          title: 'Lead Software Developer',
          period: 'Nov 2020 – Apr 2022',
          bullets: [
            'Led a 4-engineer team maintaining the core Account System (OAuth) and delivering cross-platform SDKs across Flutter, Java, Kotlin, and Swift.',
          ],
          groups: [
            {
              title: 'Key Projects',
              items: [
                { name: 'XRSPACE App (Flutter)' },
                { name: 'XRSPACE Account SDK', detail: 'iOS, Android, Unity, and Oculus.' },
              ],
            },
          ],
        },
        {
          title: 'Senior Software Developer',
          period: 'Nov 2019 – Nov 2020',
          bullets: [
            'Led a 3-engineer team developing Android and Unity SDKs; established internal protocols that streamlined Store integration and accelerated app-layer development.',
          ],
          groups: [
            {
              title: 'Key Projects',
              items: [
                { name: 'MANOVA Vr2dDisplay', detail: '2D apps displayed in a 3D scene — owned end-to-end: custom AOSP builds, Android framework changes, SDK design, and Unity app integration.' },
                { name: 'MANOVA FOTA Updates' },
                { name: 'MANOVA Stores', detail: 'App / Video / Web extensions.' },
                { name: 'MANOVA Cloud Streaming SDK' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'HTC Vive',
      roles: [
        {
          title: 'Senior → Principal Software Engineer',
          period: 'Jun 2017 – Mar 2019',
          bullets: [
            'Viveport Cloud Portal: launched a high-profile product within 1 month from business decision to deployment.',
            'Hit a strict 90 FPS standard by restructuring image caching, compressing assets, and rescheduling rendering-thread priorities.',
          ],
          groups: [
            {
              title: 'Key Projects',
              items: [
                { name: 'Viveport Cloud Portal', link: VIVEPORT_CLOUD },
                { name: 'Viveport M (Home & Store)' },
                { name: 'Vr2dDisplay', detail: '2D apps displayed in a 3D scene.' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'HTC',
      roles: [
        {
          title: 'Engineer',
          period: 'Sep 2015 – May 2017',
          bullets: [
            'Developed core Android system apps (Calendar, Wi-Fi Settings, Weather) and framework components; built the iOS companion app for the HTC RE camera with Firebase / Google Analytics.',
          ],
        },
      ],
    },
  ],
  sideProjects: [
    {
      name: 'OvOy Anime Wallpaper',
      description: 'An interactive Android live wallpaper app built with Live2D, plus a BI data framework to optimize user onboarding.',
      link: OVOY,
    },
    {
      name: 'Smart Home & AI Surveillance',
      description: 'A local edge-AI home surveillance system with Home Assistant and Frigate — old phones repurposed as cameras, pushing real-time motion alerts with live video to Apple HomeKit & Google Home.',
    },
  ],
  education: [
    {
      degree: 'M.S. in Electrical Engineering',
      school: 'National Taipei University of Technology',
      period: '2014 – 2015',
      note: 'Thesis: P2P networking and TCP connection tunneling through NAT.',
    },
    {
      degree: 'B.S. in Electrical Engineering',
      school: 'National Taipei University of Technology',
      period: '2011 – 2014',
      note: 'Early graduation: completed B.S. + M.S. in 5 years (3.5 + 1.5) for outstanding academic performance.',
    },
  ],
  labels: {
    about: 'About',
    skills: 'Skills',
    experience: 'Experience',
    sideProjects: 'Side Projects',
    education: 'Education',
    classic: 'Classic',
    immersive: 'Immersive',
    hint: 'Move your cursor through the particles',
    print: 'Print / PDF',
    contact: 'Get in touch',
    scroll: 'Scroll',
  },
}

const zh: Resume = {
  name: '陳德維',
  altName: 'De-Wei Chen',
  headline: '產品團隊負責人 · 全端工程師',
  location: '台灣 台北',
  email: en.email,
  links: en.links,
  stats: [
    { value: '10+', label: '年 行動開發' },
    { value: '7+', label: '年 VR / XR' },
    { value: '3+', label: '年 後端' },
    { value: '87%', label: '雲端成本降幅' },
  ],
  about: [
    { lead: '產品團隊負責人暨全端工程師', text: '，擁有 10 年以上行動開發、7 年以上 VR、3 年以上後端經驗，曾帶領最多 9 人的跨職能團隊。' },
    { lead: '績效頂尖：', text: '進入 HTC 第二年，即在 70 人部門中績效排名第一。' },
    { lead: 'AI 驅動的問題解決者：', text: '積極運用 AI 輔助工作流程，主導開發方向並解決複雜的工程挑戰。' },
  ],
  skills: [
    { group: 'AI Agents', items: en.skills[0].items },
    { group: '行動開發', items: en.skills[1].items },
    { group: '3D / 渲染', items: en.skills[2].items },
    { group: '後端', items: en.skills[3].items },
    { group: '架構', items: ['Clean Architecture', '領域驅動設計 (DDD)', '事件驅動系統'] },
    { group: '領導力', items: ['跨職能團隊領導', '技術指導', '敏捷 / Scrum', '雲端成本優化'] },
  ],
  experience: [
    {
      name: 'Homee AI',
      roles: [
        {
          title: '產品團隊負責人',
          period: '2025.05 – 2026.04',
          bullets: [
            '帶領 9 人跨職能團隊（App、前端、後端、DevOps），負責公司旗艦產品從規劃到上線的端到端交付，並將核心平台與 AI 技術整合。',
            '建立全端、T 型的工程文化，統一部門的 Scrum 流程，推動導入 AI 輔助開發工具以加速產品迭代。',
            '設計事件匯流排、工作佇列與 CPU/GPU 資源調度等核心系統，使每月雲端基礎設施成本降低 87%。',
          ],
        },
        {
          title: '團隊負責人 & 資深軟體工程師',
          period: '2024.03 – 2025.05',
          bullets: ['帶領 4 人平台團隊，橫跨渲染與 App 開發，交付核心渲染層 SDK，被外部合作夥伴與內部系統採用。'],
          groups: [
            {
              title: '空間運算',
              items: [
                { name: '3D Gaussian Splatting', detail: '以 3DGS 視覺化室內空間，並使用 Three.js 渲染。' },
                { name: 'Omniverse 雲端串流', detail: '整合 Omniverse 與雲端串流至 VR/AR 裝置，串接 Blender、3DS Max 與 Unity 工作流程。' },
                { name: 'Apple RoomPlan', detail: '將 RoomPlan 整合進空間運算應用。' },
                { name: 'Apple Vision Pro', detail: '在 Vision Pro 上開發並部署 Unity 應用。' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'XRSPACE',
      roles: [
        {
          title: '副理',
          period: '2022.04 – 2023.09',
          bullets: [
            '核心後端系統技術負責人，以 AWS S3、MongoDB、Redis 建構服務；以 OpenAPI 規範統一 API 文件，並整合進 GitLab/GitHub CI/CD 自動部署。',
          ],
          groups: [
            {
              title: 'PartyOn 虛擬 KTV & 演唱會',
              items: [
                { name: '直播串流', detail: '整合 Wowza（HLS/WebRTC），為大型虛擬活動提供低延遲影像。' },
                { name: '即時音訊', detail: '部署 Jamulus，實現延遲低於 20ms 的多人合奏。' },
                { name: '多人連線後端', detail: '建置並擴展遊戲與帳號伺服器，支援即時房間同步（PUN）與高可用驗證。' },
              ],
            },
          ],
        },
        {
          title: '主任軟體工程師',
          period: '2020.11 – 2022.04',
          bullets: ['帶領 4 人團隊維護核心帳號系統（OAuth），並交付 Flutter、Java、Kotlin、Swift 跨平台 SDK。'],
          groups: [
            {
              title: '重點專案',
              items: [
                { name: 'XRSPACE App（Flutter）' },
                { name: 'XRSPACE Account SDK', detail: '支援 iOS、Android、Unity 與 Oculus。' },
              ],
            },
          ],
        },
        {
          title: '資深軟體工程師',
          period: '2019.11 – 2020.11',
          bullets: ['帶領 3 人團隊開發與維護 Android 及 Unity SDK；建立內部溝通協定，簡化商店整合並加速應用層開發。'],
          groups: [
            {
              title: '重點專案',
              items: [
                { name: 'MANOVA Vr2dDisplay', detail: '在 3D 場景中顯示 2D 應用 — 獨立完成端到端開發：客製 AOSP、修改 Android Framework、設計 SDK 到 Unity App 整合。' },
                { name: 'MANOVA FOTA 更新' },
                { name: 'MANOVA 商店', detail: 'App / 影音 / Web 擴充。' },
                { name: 'MANOVA 雲端串流 SDK' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'HTC Vive',
      roles: [
        {
          title: '資深 → 主任軟體工程師',
          period: '2017.06 – 2019.03',
          bullets: [
            'Viveport Cloud Portal：從商業決策到上線僅用 1 個月，推出高關注度產品。',
            '重構圖片快取、壓縮資源並調整渲染執行緒優先序，達成嚴格的 90 FPS 標準。',
          ],
          groups: [
            {
              title: '重點專案',
              items: [
                { name: 'Viveport Cloud Portal', link: VIVEPORT_CLOUD },
                { name: 'Viveport M（Home 與 Store）' },
                { name: 'Vr2dDisplay', detail: '在 3D 場景中顯示 2D 應用。' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'HTC',
      roles: [
        {
          title: '工程師',
          period: '2015.09 – 2017.05',
          bullets: [
            '開發 Android 核心系統 App（行事曆、Wi-Fi 設定、天氣）與 Framework 元件；打造 HTC RE 相機的 iOS 配套 App，整合 Firebase / Google Analytics。',
          ],
        },
      ],
    },
  ],
  sideProjects: [
    {
      name: 'OvOy 動漫桌布',
      description: '以 Live2D 打造的 Android 互動動態桌布 App，並建立 BI 數據框架來優化新手引導。',
      link: OVOY,
    },
    {
      name: '智慧家庭 & AI 監控',
      description: '以 Home Assistant 與 Frigate 建置本地端 Edge AI 居家監控，將舊手機改造成攝影機，並把即時移動偵測警報與影像推送至 Apple HomeKit 與 Google Home。',
    },
  ],
  education: [
    {
      degree: '電機工程 碩士',
      school: '國立臺北科技大學',
      period: '2014 – 2015',
      note: '論文研究：P2P 網路與穿越 NAT 的 TCP 連線通道。',
    },
    {
      degree: '電機工程 學士',
      school: '國立臺北科技大學',
      period: '2011 – 2014',
      note: '因學業表現優異提前畢業：5 年完成學士與碩士（3.5 + 1.5）。',
    },
  ],
  labels: {
    about: '關於我',
    skills: '技能',
    experience: '工作經歷',
    sideProjects: 'Side Projects',
    education: '學歷',
    classic: '經典',
    immersive: '沉浸',
    hint: '移動游標穿過粒子試試看',
    print: '列印 / PDF',
    contact: '聯絡我',
    scroll: '向下捲動',
  },
}

export const resume: Record<Lang, Resume> = { en, zh }

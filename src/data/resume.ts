// Language-neutral resume data: ids, order, links, numbers and dates.
// Everything a reader sees as words lives in src/i18n/locales/*.json, keyed by these ids.

export type Lang = 'zh' | 'en'

/** "YYYY-MM" or "YYYY". `end: null` means ongoing; no `end` means a single point in time. */
export interface Period {
  start: string
  end?: string | null
}

export interface RoleData {
  id: string
  /** Job titles stay in English in every language. */
  title: string
  period: Period
  groups?: { id: string; items: { id: string; link?: string }[] }[]
}

export interface CompanyData {
  id: string
  roles: RoleData[]
}

export const profile = {
  email: 'iam.dw.chen@gmail.com',
  links: {
    github: 'https://github.com/DeweiChen',
    linkedin: 'https://www.linkedin.com/in/de-wei-chen-400709a7/',
    website: 'https://deweichen.github.io/',
  },
}

export const stats = [
  { id: 'mobile', value: '10+' },
  { id: 'vr', value: '7+' },
  { id: 'backend', value: '3+' },
  { id: 'cost', value: '87%' },
] as const

export const skills = ['ai', 'mobile', 'rendering', 'backend', 'architecture', 'leadership'] as const

export const experience: CompanyData[] = [
  {
    id: 'freelance',
    roles: [{ id: 'freelance', title: 'Freelance Software Engineer', period: { start: '2026-04', end: null } }],
  },
  {
    id: 'homee',
    roles: [
      { id: 'lead', title: 'Product Team Lead', period: { start: '2025-05', end: '2026-04' } },
      {
        id: 'senior',
        title: 'Team Lead & Senior Software Engineer',
        period: { start: '2024-03', end: '2025-05' },
        groups: [{ id: 'spatial', items: [{ id: '3dgs' }, { id: 'omniverse' }, { id: 'roomplan' }, { id: 'visionpro' }] }],
      },
    ],
  },
  {
    id: 'xrspace',
    roles: [
      {
        id: 'manager',
        title: 'Assistant Manager',
        period: { start: '2022-04', end: '2023-09' },
        groups: [{ id: 'partyon', items: [{ id: 'streaming' }, { id: 'audio' }, { id: 'multiplayer' }] }],
      },
      {
        id: 'lead',
        title: 'Lead Software Developer',
        period: { start: '2020-11', end: '2022-04' },
        groups: [{ id: 'projects', items: [{ id: 'app' }, { id: 'accountSdk' }] }],
      },
      {
        id: 'senior',
        title: 'Senior Software Developer',
        period: { start: '2019-11', end: '2020-11' },
        groups: [{ id: 'projects', items: [{ id: 'vr2d' }, { id: 'fota' }, { id: 'stores' }, { id: 'streaming' }] }],
      },
    ],
  },
  {
    id: 'htc',
    roles: [
      {
        id: 'principal',
        title: 'Principal Software Engineer',
        period: { start: '2017-06', end: '2019-03' },
        groups: [
          {
            id: 'projects',
            items: [
              { id: 'cloudPortal', link: 'https://kknews.cc/tech/yngarog.html' },
              { id: 'viveportM', link: 'https://www.vive.com/cn/newsroom/2016-11-08/' },
              { id: 'vr2d' },
            ],
          },
        ],
      },
      { id: 'engineer', title: 'Engineer', period: { start: '2015-09', end: '2017-05' } },
    ],
  },
]

export interface SideProjectData {
  id: string
  period: Period
  link?: string
  /** Optional app icon path under public/ (e.g. "screens/my-app-icon.png"). Falls back to a generated glyph. */
  icon?: string
  /** Optional screenshot path under public/ (e.g. "screens/my-app.jpg"). Falls back to a painted screen. */
  screen?: string
}

export const sideProjects: SideProjectData[] = [
  { id: 'smartHome', period: { start: '2022', end: null }, icon: 'screens/home-assistant-icon.png' },
  { id: 'toiletFinder', period: { start: '2023' }, icon: 'screens/toilet-finder-icon.png', screen: 'screens/toilet-finder.jpg' },
  {
    id: 'ovoy',
    period: { start: '2016' },
    link: 'https://studioxin.com/demo/ovoy/app.html',
    icon: 'screens/ovoy-icon.png',
    screen: 'screens/ovoy.jpg',
  },
]

/** Degree names stay in English in every language. */
export const education: { id: string; degree: string; period: Period }[] = [
  { id: 'ms', degree: 'M.S. in Electrical Engineering', period: { start: '2014', end: '2015' } },
  { id: 'bs', degree: 'B.S. in Electrical Engineering', period: { start: '2011', end: '2014' } },
]

/** Books read, shelf order. `reading` marks the one on the go, which the Now note is about. */
export const books: { id: string; reading?: boolean }[] = [
  { id: 'leanStartup' },
  { id: 'peak' },
  { id: 'atomicHabits' },
  { id: 'weNeedToTalk' },
  { id: 'artOfSpending', reading: true },
]

/** When the Now note was last rewritten, "YYYY-MM". */
export const nowUpdated = '2026-10'

/** Things outside work that stand for most of my career: one prop each in the room. */
export const hobbies = ['android', 'metaverse', 'travel'] as const

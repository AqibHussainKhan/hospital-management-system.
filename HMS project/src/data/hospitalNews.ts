export interface NewsSection {
  heading: string;
  paragraphs: string[];
}

export interface HospitalNewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  department: string;
  publishedAt: string; // YYYY-MM-DD
  author: string;
  image?: string;
  imageAlt: string;
  imageCredit?: { name: string; url: string };
  sections: NewsSection[];
  highlights: string[];
  tags: string[];
  action?: {
    label: string;
    path: "/laboratory" | "/doctors" | "/appointments";
  };
  isDemo?: boolean;
}

// Headlines, summaries, categories and dates match the supplied screenshot.
// Full article copy is editable sample content, not an official hospital notice.
export const hospitalNews: HospitalNewsItem[] = [
  {
    id: "advanced-diagnostic-laboratory",
    title: "New advanced diagnostic laboratory now operational.",
    summary:
      "The hospital has expanded laboratory services with faster diagnostics and improved patient workflows.",
    category: "Hospital Update",
    department: "Laboratory",
    publishedAt: "2026-09-28",
    author: "Hospital Administration",
    image:
      "https://images.unsplash.com/photo-1578496479530-799fd6d0803a?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Diagnostic laboratory equipment",
    imageCredit: {
      name: "National Cancer Institute / Unsplash",
      url: "https://unsplash.com/photos/gray-laboratory-machine-to8o0bqOA6Q",
    },
    sections: [
      {
        heading: "Expanded diagnostic services",
        paragraphs: [
          "The new diagnostic laboratory forms part of the hospital's expanded laboratory services. This update focuses on faster diagnostic coordination and an improved patient workflow.",
          "Laboratory services support the wider patient care process by connecting test requests, diagnostic work and report review.",
        ],
      },
      {
        heading: "Information for patients and care teams",
        paragraphs: [
          "Contact the hospital laboratory team to confirm the availability of a specific test, any preparation requirements and the expected reporting time.",
          "Confirm collection arrangements and service charges with the relevant hospital desk before attending. These details should be provided in the hospital's official announcement.",
        ],
      },
      {
        heading: "Explore the laboratory workspace",
        paragraphs: [
          "Open the Laboratory section of the management system to continue to the hospital's laboratory workspace.",
        ],
      },
    ],
    highlights: [
      "Expanded laboratory services",
      "Faster diagnostic coordination",
      "Improved patient workflows",
    ],
    tags: ["Diagnostics", "Laboratory", "Hospital services"],
    action: { label: "Open laboratory", path: "/laboratory" },
    isDemo: true,
  },
  {
    id: "specialist-doctors-join",
    title:
      "Specialist doctors join the cardiology and neurology departments.",
    summary:
      "New consultants have joined the hospital to expand specialist care and appointment availability.",
    category: "Medical Team",
    department: "Cardiology & Neurology",
    publishedAt: "2026-09-25",
    author: "Hospital Administration",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Specialist doctor in a clinical setting",
    sections: [
      {
        heading: "Growing the specialist team",
        paragraphs: [
          "New consultants have joined the Cardiology and Neurology departments. The announcement highlights the hospital's expanded specialist care and appointment availability.",
          "The specialist team supports patients seeking care in these departments and helps coordinate the next steps in their hospital visit.",
        ],
      },
      {
        heading: "Finding the right consultant",
        paragraphs: [
          "Use the Doctors directory to explore the hospital's specialists and their departments. Confirm the consultant's current schedule with the appointment desk when arranging a visit.",
          "The official hospital announcement should include the consultants' names, qualifications and confirmed consultation schedules.",
        ],
      },
      {
        heading: "Appointments and follow-up",
        paragraphs: [
          "For appointment availability or a follow-up visit, contact the hospital appointment team. Bring any documents requested by that team for your visit.",
        ],
      },
    ],
    highlights: [
      "Expanded specialist care",
      "Cardiology and Neurology departments",
      "Additional appointment availability",
    ],
    tags: ["Specialists", "Cardiology", "Neurology"],
    action: { label: "Explore doctors", path: "/doctors" },
    isDemo: true,
  },
  {
    id: "digital-appointment-system",
    title: "Digital appointment system improves patient scheduling.",
    summary:
      "The new scheduling workflow helps reduce waiting time and improves coordination between departments.",
    category: "Patient Care",
    department: "Appointments",
    publishedAt: "2026-09-21",
    author: "Hospital Administration",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Hospital reception and patient waiting area",
    imageCredit: {
      name: "Martha Dominguez de Gouveia / Unsplash",
      url: "https://unsplash.com/photos/hospital-lobby-reception-with-signage-nMyM7fxpokE",
    },
    sections: [
      {
        heading: "A coordinated scheduling workflow",
        paragraphs: [
          "The digital appointment workflow supports patient scheduling and coordination between hospital departments. The update focuses on reducing waiting time and making appointment arrangements clearer.",
          "A coordinated appointment process helps staff and patients keep track of the next steps in a hospital visit.",
        ],
      },
      {
        heading: "Before your appointment",
        paragraphs: [
          "Confirm the appointment date, time and relevant department with the hospital appointment desk. Ask the team about any documents or arrival instructions required for the visit.",
          "If your plans change, contact the appointment team to discuss an update to your booking. The official announcement should explain the hospital's confirmed rescheduling process.",
        ],
      },
      {
        heading: "Open the appointments workspace",
        paragraphs: [
          "Use the Appointments section of the management system to continue to the hospital's scheduling workspace.",
        ],
      },
    ],
    highlights: [
      "Improved patient scheduling",
      "Better coordination between departments",
      "A clearer appointment workflow",
    ],
    tags: ["Appointments", "Digital services", "Patient experience"],
    action: { label: "Open appointments", path: "/appointments" },
    isDemo: true,
  },
];

export function newestNews(items: HospitalNewsItem[]): HospitalNewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function filterNews(
  items: HospitalNewsItem[],
  options: {
    query: string;
    category: string;
    savedOnly: boolean;
    savedIds: Set<string>;
    oldestFirst: boolean;
  },
): HospitalNewsItem[] {
  const terms = options.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const result = newestNews(items).filter((item) => {
    if (options.category && item.category !== options.category) return false;
    if (options.savedOnly && !options.savedIds.has(item.id)) return false;
    const haystack = [
      item.title, item.summary, item.department, item.category, ...item.tags,
      ...item.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
    ].join(" ").toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  return options.oldestFirst ? result.reverse() : result;
}

export function readingMinutes(item: HospitalNewsItem): number {
  const text = [
    item.title, item.summary, ...item.highlights,
    ...item.sections.flatMap((section) => [section.heading, ...section.paragraphs]),
  ].join(" ");
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));
}

export function formatNewsDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date unavailable";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const roundTrip = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  if (roundTrip !== value) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export function storedNewsIds(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 160).slice(0, 500),
  );
}

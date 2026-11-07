export type Project = {
  id: string;
  number: string;
  name: string;
  eyebrow: string;
  category: string;
  description: string;
  deeper: string;
  problem: string;
  evidence: string;
  role: string;
  stack: string[];
  repo: string;
  demo?: string;
  visual: "chess" | "agent" | "chat" | "vision" | "club" | "data" | "terminal" | "travel";
  status: string;
};

export const github = "https://github.com/Areeb-coder";

export const projects: Project[] = [
  {
    id: "knightforge", number: "01", name: "KnightForge", eyebrow: "THE BOARD IS YOURS", category: "Interactive chess · C++",
    description: "A C++17 chess engine with legal move generation, classical search and a browser-playable WebAssembly build.",
    deeper: "The repository documents legal move generation, SAN, alpha-beta search, transposition tables, UCI support and perft-style validation. The live build lets visitors play against the engine in the browser.",
    problem: "How do you turn a chess engine into something that is both technically rigorous and directly playable?",
    evidence: "C++17 engine source · UCI support · WebAssembly browser build · public repository and live demo",
    role: "Independent project", stack: ["C++", "Chess", "GitHub Pages"], repo: `${github}/KnightForge`, demo: "https://areeb-coder.github.io/KnightForge/", visual: "chess", status: "LIVE DEMO"
  },
  {
    id: "loreline", number: "02", name: "LORELINE", eyebrow: "UNDERSTAND THE STORY IN THE CODE", category: "Developer tools · AI engineering",
    description: "An AI engineering-intelligence tool for exploring code structure, dependencies and the Git history behind implementation decisions.",
    deeper: "LORELINE combines source parsing and symbol indexing with repository search, architecture maps, code-health signals and historical investigation of commits, diffs and contributors. AI-assisted reasoning is optional; evidence-only history investigation remains available without an API key.",
    problem: "How can an engineer understand not only what a codebase looks like today, but why it evolved that way?",
    evidence: "Python + TypeScript components · FastAPI orchestration · code indexing · architecture maps · Git history investigation · public source",
    role: "Project integration & application", stack: ["Python", "TypeScript", "FastAPI", "AI"], repo: `${github}/loreline-ai`, visual: "terminal", status: "SOURCE AVAILABLE"
  },
  {
    id: "battlecode", number: "03", name: "Cambridge Battlecode", eyebrow: "DECISION-MAKING UNDER PRESSURE", category: "Autonomous agents · Strategy",
    description: "Competitive autonomous-agent engineering built around strategy, simulation, replay analysis and iterative optimisation.",
    deeper: "The work spans C++ bot implementations, match tooling, replay inspection and controlled strategy experiments. The repository records the engineering process while keeping competitive claims tied to verifiable evidence.",
    problem: "How can an autonomous agent make better decisions against changing opponents rather than simply follow a fixed script?",
    evidence: "C++ agents · benchmark tooling · replay analysis · iterative strategy experiments · public source",
    role: "Bot strategy & tooling", stack: ["C++", "Algorithms", "Simulation", "Benchmarking"], repo: `${github}/sagev135`, visual: "agent", status: "RESEARCH LOG"
  },
  {
    id: "newstrace", number: "04", name: "NewsTrace", eyebrow: "FOLLOW THE SOURCE", category: "Information tools · Python",
    description: "A journalist-intelligence and news-coverage analysis platform for discovering articles, journalists and coverage patterns.",
    deeper: "NewsTrace automates article discovery and journalist extraction, enriches profiles with public information and visualises author-topic relationships. It uses parallel Playwright scraping, BeautifulSoup, Pandas and Streamlit.",
    problem: "How can someone discover who covers a topic at a news outlet without manually searching hundreds of article and author pages?",
    evidence: "Python · Streamlit · Playwright · BeautifulSoup · Pandas · journalist-topic network · Runner-Up at Hack of Thrones (GDG JMI)",
    role: "Independent project", stack: ["Python", "Web", "Information retrieval"], repo: `${github}/NewsTrace`, demo: "https://news-trace-pearl.vercel.app", visual: "terminal", status: "LIVE PROJECT"
  },
  {
    id: "whatsapp", number: "06", name: "WhatsApp Summarizer", eyebrow: "LESS SCROLL. MORE SIGNAL.", category: "Applied AI · Productivity",
    description: "A summarisation tool for turning long WhatsApp chat exports into concise, easier-to-scan context.",
    deeper: "The project explores practical summarisation for long conversational histories, with the goal of reducing scrolling while retaining the signal a reader actually needs.",
    problem: "How do you compress a noisy conversation without losing the context that makes the summary useful?",
    evidence: "Python · NLP/summarisation workflow · public repository",
    role: "Product development", stack: ["Python", "NLP", "Web application"], repo: `${github}/whatsapp-summarizer`, visual: "chat", status: "SOURCE AVAILABLE"
  },
  {
    id: "dronevision", number: "07", name: "Drone Vision", eyebrow: "SEE THE SYSTEM DIFFERENTLY", category: "Computer vision · Robotics",
    description: "A computer-vision exploration focused on interpreting visual information in a drone context.",
    deeper: "The project sits at the intersection of vision and robotics. The portfolio intentionally avoids publishing model, dataset or benchmark claims until those details are explicitly verified from the source.",
    problem: "How can visual information be turned into useful machine-readable signals for a moving platform?",
    evidence: "Python · computer vision · robotics-oriented workflow · public source",
    role: "Computer vision exploration", stack: ["Python", "Computer vision", "Vision systems"], repo: `${github}/DroneVisionProject`, visual: "vision", status: "SOURCE AVAILABLE"
  },
  {
    id: "piper", number: "08", name: "Piper Chess Club", eyebrow: "A COMMUNITY, BUILT TO MOVE", category: "Community · Web experience",
    description: "A digital home for Piper Chess Club, its identity, events and competitive culture.",
    deeper: "The project connects web development with Areeb's role as President of Piper Chess Club, supporting a student community built around chess, competition and events.",
    problem: "How can a student club have a digital presence that feels like a community identity rather than a generic college page?",
    evidence: "Web development · club identity · event communication · community leadership",
    role: "Club leadership & digital work", stack: ["Web development", "Community", "Chess"], repo: `${github}/piper-chess-club`, visual: "club", status: "COMMUNITY PROJECT"
  },
  {
    id: "offline", number: "05", name: "Offline Summarizer", eyebrow: "A LITTLE CLOSER TO THE DEVICE", category: "ML experiments · Local-first",
    description: "An offline-first summarisation experiment exploring useful text processing closer to the device.",
    deeper: "The project explores local summarisation rather than assuming an always-online API. The repository documents the current implementation and supported runtime; performance claims are intentionally kept out of the portfolio until benchmarked.",
    problem: "Can useful summarisation be delivered locally, with less dependence on always-on external services?",
    evidence: "Python · local-first summarisation · public repository",
    role: "Independent experiment", stack: ["Python", "NLP", "Local inference"], repo: `${github}/offline-summarizer`, visual: "data", status: "EXPERIMENT"
  },
  {
    id: "travel", number: "09", name: "AI Travel Agent", eyebrow: "FROM INTENT TO ITINERARY", category: "AI product · Full-stack",
    description: "An AI travel-agent experiment exploring how natural-language intent can become a structured travel workflow.",
    deeper: "The project explores the product boundary between a conversational request and a useful itinerary. The portfolio keeps API, model and booking claims conservative until they are verified from the current implementation.",
    problem: "How can an open-ended travel request become a useful, structured plan without making the interaction feel like a form?",
    evidence: "AI product exploration · full-stack workflow · public repository",
    role: "Product exploration", stack: ["AI", "Full-stack", "APIs"], repo: `${github}/ai-travel-agent`, visual: "travel", status: "SOURCE AVAILABLE"
  },
];

export const achievements = [
  { eyebrow: "HACKATHON", title: "NewsTrace — Runner-Up", detail: "Runner-Up at the Hack of Thrones Hackathon organised by Google Developer Group (GDG) JMI.", proof: "NewsTrace project recognition" },
  { eyebrow: "OPEN SOURCE", title: "Writers’ Pub — GSSoC ’26", detail: "Created and maintained Writers’ Pub after it was selected for the GSSoC ’26 project catalogue; the public repository records 8 merged approved PRs from 7 external contributors.", proof: "Project catalogue + public PR history" },
  { eyebrow: "COMPETITIVE ENGINEERING", title: "Cambridge Battlecode", detail: "Built and iterated autonomous strategy agents through bot development, match tooling, replay analysis and controlled experiments.", proof: "Public bot repository" },
  { eyebrow: "LEADERSHIP", title: "Piper Chess Club", detail: "President of Piper Chess Club, connecting competitive chess, student events and a digital community experience.", proof: "Club leadership + public project" },
] as const;

export const capabilities = [
  {
    id: "intelligence", number: "01", label: "Intelligence", sub: "AI · ML · agents",
    title: "Make intelligence useful.", body: "I like turning models, algorithms and data into tools that help people understand something, decide something or get something done.",
    bullets: ["AI-assisted workflows", "Autonomous agents & game strategy", "Computer vision and language tools"], micro: "THE THINKING LAYER", visual: "network"
  },
  {
    id: "products", number: "02", label: "Products", sub: "Interfaces · systems · APIs",
    title: "Build the whole thing.", body: "From the first interaction to the logic behind it, I enjoy connecting the parts into a product that feels coherent, useful and dependable.",
    bullets: ["Frontend and full-stack applications", "Developer tools and automation", "Data-informed product experiences"], micro: "THE PRODUCT LAYER", visual: "dashboard"
  },
  {
    id: "experiences", number: "03", label: "Experiences", sub: "Motion · interaction · craft",
    title: "Give technology a feeling.", body: "I care about the details between function and experience: motion, feedback, visual language and the small decisions that make software feel considered.",
    bullets: ["Interactive web experiences", "Motion-led interfaces", "Chess-inspired and experimental UI"], micro: "THE EXPERIENCE LAYER", visual: "motion"
  }
] as const;

export const toolkit = [
  "Python", "C++", "TypeScript", "JavaScript", "React", "Next.js", "FastAPI", "Flask", "AI / ML", "Computer Vision", "LLM APIs", "OpenRouter", "Algorithms", "Git & GitHub", "Data Science", "Automation", "CSS", "Node.js"
];

export const guideKnowledge = `You are Dot, the friendly portfolio guide on Areeb Khalid's personal website. Speak in concise, natural language. Do not invent achievements, metrics, job experience, awards, rankings, or project internals. Areeb Khalid is a second-year B.Tech Computer Science and Data Science student at Jamia Millia Islamia and President of Piper Chess Club. His interests include AI/ML, full-stack development, algorithms, competitive programming, developer tools, automation, data science, chess and creative technology. Strong public projects include KnightForge (C++17 chess engine with search, UCI and WebAssembly demo), LORELINE (AI engineering intelligence for code structure and Git history), Cambridge Battlecode bot work (autonomous strategy, C++ tooling, replay analysis and optimisation), NewsTrace (journalist-intelligence and news-coverage analysis; Runner-Up at Hack of Thrones organised by GDG JMI), Offline Summarizer, WhatsApp Summarizer, and Writers’ Pub (GSSoC ’26 project catalogue; project owner/maintainer). GitHub profile: https://github.com/Areeb-coder. The site has sections: what I build, project lab, method, achievements, toolkit, about, FAQ and contact. Direct visitors to relevant sections and links. Speak as Dot in first person and maintain a consistent character identity. If asked about details not supported here, say they should inspect the linked repository or ask Areeb.`;

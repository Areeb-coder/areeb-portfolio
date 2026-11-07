"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronRight, Code2, Command,
  Github, Mail, Menu, MessageCircle, Minus, MoveUpRight, Play, Plus, Send, Sparkles,
  Volume2, VolumeX, X
} from "lucide-react";
import { achievements, capabilities, github, projects, toolkit, type Project } from "../data/portfolio";
import DotGuide, { DotMicroPopup, type DotMicroPopupPosition } from "./dot/dot-guide";
import { DotMotionController } from "./dot/dot-motion";
import type { DotSoundCue } from "./dot/use-dot-audio";

type AssistantMessage = { role: "user" | "assistant"; content: string };
type AssistantMood = "idle" | "curious" | "thinking" | "playful";
type TourStep = { id: string; title: string; message: string; action: string };
const DOT_EXPLORATION_DURATION_MS = 115_000;

type DotTourBeat = {
  id: string;
  selector: string;
  action: "headline"|"capability"|"crew"|"project"|"process"|"toolkit"|"about"|"achievements"|"faq"|"contact";
  comments: string[];
  pause: number;
};

const DOT_TOUR_BEATS: DotTourBeat[] = [
  { id:"top", selector:".ticker", action:"headline", pause:1750, comments:["A moving headline. I have an idea."] },
  { id:"capabilities", selector:".cap-tab", action:"capability", pause:1650, comments:["Three routes. I like options."] },
  { id:"crew", selector:".crew-card", action:"crew", pause:1850, comments:["A whole team. No meetings."] },
  { id:"process", selector:".process-card", action:"process", pause:1750, comments:["A small pause for the method behind the work."] },
  { id:"lab", selector:".project-open", action:"project", pause:1850, comments:["A proper project index. I like things with source code attached."] },
  { id:"toolkit", selector:".tool-chip", action:"toolkit", pause:1700, comments:["A few familiar tools in here."] },
  { id:"achievements", selector:".achievement-card", action:"achievements", pause:1800, comments:["Proof matters. These are the signals I would keep on the table." ] },
  { id:"about", selector:".about-monogram", action:"about", pause:1650, comments:["The person behind the builds matters too." ] },
  { id:"faq", selector:".faq-list", action:"faq", pause:2050, comments:["These questions look a little too well-behaved."] },
  { id:"contact", selector:".contact-stamp", action:"contact", pause:1900, comments:["All right. Your move."] },
];

const tourSteps: TourStep[] = [
  { id: "top", title: "The starting point", message: "This is Areeb's digital front door: software engineering, AI experiments and creative technology, all in one place. The headline is the short version; the rest of the page is the evidence.", action: "Explore what I build" },
  { id: "capabilities", title: "Three ways of thinking", message: "Areeb's work clusters around intelligence, products and experiences. Pick a tab to see how each discipline shows up in his projects and interests.", action: "Meet the lab crew" },
  { id: "crew", title: "The lab crew", message: "This cast is made from real projects, not fictional employees. Each card gives a quick read on a build and opens the matching project file.", action: "Open the project index" },
  { id: "lab", title: "The project lab", message: "This is the workbench. Open any project to read the short case note, then jump to its source or live demo. Details stay honest where the public repository has not been audited line by line.", action: "See how he works" },
  { id: "process", title: "The build loop", message: "The approach is simple: understand the problem, shape a system and test the result. The loop matters more than the tool of the week.", action: "Explore the toolkit" },
  { id: "toolkit", title: "Tools, not trophies", message: "These are the languages, frameworks and areas Areeb has worked with or is exploring. No made-up percentage bars—just the toolbox.", action: "A little context" },
  { id: "achievements", title: "Proof on the table", message: "A few signals sit here beside the projects: hackathon recognition, open-source ownership, competitive engineering and club leadership. The point is evidence, not a trophy wall.", action: "Meet the person behind it" },
  { id: "about", title: "The person behind it", message: "Areeb is a second-year B.Tech Computer Science and Data Science student at Jamia Millia Islamia and President of Piper Chess Club. Chess is a recurring influence on how he approaches systems and decisions.", action: "Get in touch" },
  { id: "faq", title: "A few useful answers", message: "The FAQ covers project links, collaboration and how Dot works. Dot can also answer questions while you browse.", action: "Get in touch" },
  { id: "contact", title: "Your move", message: "That is the tour. Reach out through GitHub, explore a repository, or use the contact link if an email address has been configured by Areeb.", action: "Finish the tour" }
];

const faqs = [
  { q: "What kind of developer is Areeb?", a: "Areeb is a computer science and data science student interested in software engineering, AI/ML, full-stack products, developer tools, algorithms and creative technology. He likes work that connects solid engineering with a clear user experience." },
  { q: "Which projects should I explore first?", a: "Start with KnightForge for the interactive chess angle, Cambridge Battlecode for autonomous strategy and optimisation, then WhatsApp Summarizer or Drone Vision for applied AI and computer-vision directions." },
  { q: "Are these projects open source?", a: "The project cards link to public GitHub repositories wherever available. Each repository is the source of truth for implementation details and its current state. A live demo is linked when one is known." },
  { q: "Can I collaborate with Areeb?", a: "Yes. The best first step is to reach out through GitHub with a little context about the project, problem or opportunity. A configured email contact also appears in the footer." },
  { q: "Is the floating assistant a real AI?", a: "Dot can navigate the page and answer a curated set of portfolio questions without any API key. To enable open-ended AI replies, add an OpenRouter key to the server-side environment settings. The key is never sent to the browser." }
];

function getVisibleViewport() {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, viewport?.width ?? window.innerWidth),
    height: Math.max(1, viewport?.height ?? window.innerHeight),
  };
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

/** Dot's fixed layer lives at body level so page overflow/stacking contexts cannot clip it. */
function DotPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted ? createPortal(children, document.body) : null;
}

function ArrowLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  return <a className="arrow-link" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}<MoveUpRight size={15}/></a>;
}

function CapabilityArt({ kind }: { kind: string }) {
  if (kind === "network") return <div className="cap-art cap-network" aria-label="Abstract connected intelligence visualization">
    <div className="network-ring ring-one"/><div className="network-ring ring-two"/><div className="network-ring ring-three"/>
    <div className="network-core"><Sparkles size={31}/><span>INTELLIGENCE</span></div>
    {[["n1","01"],["n2","02"],["n3","03"],["n4","04"],["n5","05"]].map(([c,n])=><i className={`network-node ${c}`} key={c}>{n}</i>)}
    <span className="art-tag art-tag-a">INPUT → CONTEXT</span><span className="art-tag art-tag-b">REASON → ACT</span>
  </div>;
  if (kind === "dashboard") return <div className="cap-art cap-dashboard" aria-label="Abstract product interface">
    <div className="dash-window"><div className="dash-title"><span><i/> <i/> <i/></span><b>FIELDNOTE / SYSTEM VIEW</b><small>LIVE PREVIEW</small></div><div className="dash-body"><aside><i/><i/><i/><i/><i/></aside><div className="dash-main"><div className="dash-heading"><strong>Overview</strong><span>Today ↗</span></div><div className="dash-metrics"><i/><i/><i/></div><div className="dash-chart"><b/><b/><b/><b/><b/><b/><b/><b/><b/><b/><b/><b/></div><div className="dash-rows"><i/><i/><i/></div></div></div></div><span className="art-tag art-tag-a">DESIGN / BUILD / ITERATE</span>
  </div>;
  return <div className="cap-art cap-motion" aria-label="Abstract motion and interaction diagram"><div className="motion-cross cross-a"/><div className="motion-cross cross-b"/><div className="motion-orbit"><div className="motion-core">AK</div><i/><b/><em/></div><span className="motion-label ml-a">01 / INPUT</span><span className="motion-label ml-b">02 / FEEDBACK</span><span className="motion-label ml-c">03 / FEEL</span></div>;
}

function ProjectArt({ project }: { project: Project }) {
  switch (project.visual) {
    case "chess": return <div className="project-art art-chess"><div className="chess-board-mini">{Array.from({length: 64},(_,i)=><i className={(Math.floor(i/8)+i%8)%2 ? "dark" : "light"} key={i}>{[10,19,28,37,46].includes(i) ? "♞" : ""}</i>)}</div><span className="art-stamp">KNIGHT<br/>FORGE</span><small>THE BOARD IS YOURS</small></div>;
    case "agent": return <div className="project-art art-agent"><div className="agent-header"><span>AUTONOMOUS AGENTS · STRATEGY</span><b>FILE 03</b></div><div className="agent-grid"><span className="agent-orbit agent-orbit-a"/><span className="agent-orbit agent-orbit-b"/><div className="agent-flow"><div><small>01</small><i>OBSERVE</i></div><b>↘</b><div><small>02</small><i>DECIDE</i></div><b>↘</b><div><small>03</small><i>ACT</i></div></div></div><div className="agent-footer"><span>SIMULATION / DECISION LOOP</span><span>C++ · SEARCH · REPLAY</span></div></div>;
    case "chat": return <div className="project-art art-chat"><div className="chat-phone"><div className="phone-top"><span/> WHATSAPP / EXPORT</div><div className="chat-bubble left">Anyone got the latest notes?</div><div className="chat-bubble right">I shared the doc yesterday.</div><div className="chat-bubble left">Found it — thanks!</div><div className="chat-summary"><small>SUMMARY</small><b>3 messages · 2 topics</b><span>Notes shared · Follow-up resolved</span></div></div><small>CONVERSATION → SIGNAL</small></div>;
    case "vision": return <div className="project-art art-vision"><div className="vision-frame"><div className="vision-horizon"/><div className="vision-scan"/><i className="vision-box box-a"/><i className="vision-box box-b"/><span>OBJECT / 02</span></div><small>VISION SYSTEM / FIELD VIEW</small></div>;
    case "club": return <div className="project-art art-club"><div className="club-mark">♜</div><div className="club-type">PIPER<br/><em>CHESS CLUB</em></div><span>PLAY THE POSITION.</span><small>COMMUNITY / EVENTS / COMPETITION</small></div>;
    case "data": return <div className="project-art art-data"><div className="data-document"><small>LOCAL / SUMMARY.TXT</small><i/><i/><i/><i/><i className="short"/><div className="data-spark">✳</div></div><small>TEXT → LOCAL INSIGHT</small></div>;
    case "travel": return <div className="project-art art-travel"><div className="travel-sun"/><div className="travel-route"><i/><i/><i/><i/></div><div className="travel-label">INTENT<br/>TO<br/>ITINERARY</div><small>ROUTE / POSSIBILITY / PLAN</small></div>;
    default: return <div className="project-art art-terminal"><div className="terminal-window"><div><i/><i/><i/><b>NEWSTRACE / SOURCE LOG</b></div><p><span>01</span> fetch headline_01</p><p><span>02</span> trace original source</p><p><span>03</span> summarize context</p><p className="term-ok">✓ source attached</p></div><small>INFORMATION / TRACEABLE</small></div>;
  }
}

function CapabilityBlock() {
  const [active, setActive] = useState(0);
  const item = capabilities[active];
  return <section id="capabilities" className="capabilities section-dark">
    <div className="section-head section-wrap"><div><p className="eyebrow"><span>01</span> WHAT I BUILD</p><h2>Three ways<br/>to <em>make things.</em></h2></div><p className="section-intro-copy">Different problems need different tools. These are the three spaces where my curiosity usually turns into something tangible.</p></div>
    <div className="cap-layout section-wrap">
      <div className="cap-tabs" role="tablist" aria-label="Areas of work">
        {capabilities.map((c,i)=><button key={c.id} role="tab" aria-selected={active===i} className={active===i?"cap-tab active":"cap-tab"} onClick={()=>setActive(i)}><span>{c.number}</span><b>{c.label}</b><small>{c.sub}</small><ArrowUpRight size={17}/></button>)}
        <div className="cap-tab-note">SELECT A DISCIPLINE <ArrowRight size={13}/></div>
      </div>
      <article className="cap-content" role="tabpanel" key={item.id}>
        <div className="cap-content-top"><span>{item.micro}</span><span>0{active+1} / 03</span></div>
        <div className="cap-content-main"><div className="cap-copy"><h3>{item.title}</h3><p>{item.body}</p><ul>{item.bullets.map(b=><li key={b}><i/>{b}</li>)}</ul></div><CapabilityArt kind={item.visual}/></div>
        <div className="cap-content-foot"><span>AREAS OF INTEREST IN PRACTICE</span><div className="cap-pagination">{capabilities.map((c,i)=><button key={c.id} className={i===active?"active":""} onClick={()=>setActive(i)} aria-label={`Show ${c.label}`}/>)}</div></div>
      </article>
    </div>
  </section>;
}

function AssistantWidget({
  open,
  onOpenChange,
  onStartTour,
  soundOn,
  onToggleSound,
  touring,
  onMoodChange,
  playSound,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTour: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  touring: boolean;
  onMoodChange: (mood: AssistantMood) => void;
  playSound: (cue: DotSoundCue) => void;
}) {
  const [welcome,setWelcome] = useState(false);
  const [messages,setMessages] = useState<AssistantMessage[]>([{role:"assistant",content:"Hey, I'm Dot — Areeb's tiny guide. I can show you around, point out the interesting builds, or answer a few questions about the work. Where should we start?"}]);
  const [value,setValue] = useState("");
  const [busy,setBusy] = useState(false);
  const [mood,setMood] = useState<AssistantMood>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const moodTimerRef = useRef<number | null>(null);
  const updateMood = (next: AssistantMood) => {
    setMood(next);
    onMoodChange(next);
    if (moodTimerRef.current !== null) window.clearTimeout(moodTimerRef.current);
    moodTimerRef.current = null;
  };

  useEffect(()=>{
    if (touring || open) return;
    try {
      if (!sessionStorage.getItem("dot-welcomed")) {
        const t = window.setTimeout(()=>setWelcome(true),1350);
        return ()=>window.clearTimeout(t);
      }
    } catch { setWelcome(true); }
  },[touring,open]);

  useEffect(()=>{
    if (!open) return;
    const focusTimer = window.setTimeout(()=>inputRef.current?.focus(),120);
    return ()=>window.clearTimeout(focusTimer);
  },[open]);
  useEffect(()=>()=>{
    if (moodTimerRef.current !== null) window.clearTimeout(moodTimerRef.current);
  },[]);

  const localAnswer = (raw:string) => {
    const q=raw.toLowerCase();
    if(/project|work|build|portfolio|show me/.test(q)) return "Start with the Project Lab. KnightForge is the interactive chess build, Cambridge Battlecode is the competitive-agent track, and the other projects cover summarisation, computer vision, community and AI product ideas. Open any project card for its repository and known demo.";
    if(/battlecode|bot|chess|knightforge/.test(q)) return "There are two chess-shaped threads here: KnightForge, which has a live playable demo, and Cambridge Battlecode, where Areeb has worked on autonomous strategy, match tooling and replay analysis. I won't invent a ranking or Elo result. Want me to take you to the lab?";
    if(/skill|stack|technology|tech|language/.test(q)) return "The toolbox includes Python, C++, TypeScript and JavaScript, React/Next.js, FastAPI/Flask, AI and ML APIs, computer vision, algorithms, data science and automation. The toolkit strip is draggable on desktop.";
    if(/about|study|college|jamia|education|president|club/.test(q)) return "Areeb is a second-year B.Tech Computer Science and Data Science student at Jamia Millia Islamia, and President of Piper Chess Club. Chess, boxing, athletics, reading and oratory are part of his wider interests.";
    if(/contact|email|hire|collaborat|connect/.test(q)) return "The most reliable public route is GitHub: github.com/Areeb-coder. The START SOMETHING stamp opens Areeb's LinkedIn profile.";
    if(/tour|walk|guide|where|start/.test(q)) return "Tap LET DOT EXPLORE and I'll wander through the portfolio, play with a few real interactions and then come back here. You can interrupt me at any time.";
    if(/ai|assistant|dot/.test(q)) return "I'm Dot, the page-aware guide. I can navigate the sections and answer from the portfolio's verified notes. Add an OpenRouter key to .env.local to enable open-ended model replies; without one, I use the local portfolio guide.";
    return "I can help with Areeb's projects, engineering interests, education, chess work and how to get in touch. Try asking 'Which project should I explore first?' or let me explore the site.";
  };

  const send = async (text:string) => {
    const clean=text.trim(); if(!clean || busy) return;
    const next=[...messages,{role:"user" as const,content:clean}];
    setMessages(next); setValue(""); setBusy(true); updateMood("thinking");
    let answer="";
    try {
      const res=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next})});
      if(res.ok){const data=await res.json(); if(typeof data.answer==="string") answer=data.answer;}
    } catch { /* The curated local guide is the graceful offline fallback. */ }
    if(!answer) answer=localAnswer(clean);
    setMessages(v=>[...v,{role:"assistant",content:answer}]);
    setBusy(false);
    updateMood("curious");
    playSound("interaction");
    moodTimerRef.current = window.setTimeout(() => updateMood("idle"), 1800);
  };

  const dismissWelcome=()=>{setWelcome(false);try{sessionStorage.setItem("dot-welcomed","1");}catch{/* no-op */}};
  const toggleOpen=()=>{dismissWelcome();onOpenChange(!open);updateMood("curious");moodTimerRef.current=window.setTimeout(()=>updateMood("idle"),850);};
  const onSubmit=(e:FormEvent)=>{e.preventDefault();void send(value);};
  const onInputKey=(e:ReactKeyboardEvent<HTMLInputElement>)=>{if(e.key==="Escape")onOpenChange(false);};

  return <>
    {welcome && !open && !touring && <div className="dot-welcome" role="status"><span className="welcome-spark">✳</span><div><b>Need a guide?</b><small>Dot can show you around.</small></div><button onClick={toggleOpen}>ASK DOT <ArrowUpRight size={12}/></button><button className="welcome-close" onClick={dismissWelcome} aria-label="Dismiss welcome"><X size={13}/></button></div>}
    {open && <section className="dot-panel" aria-label="Dot portfolio assistant">
      <header className="dot-panel-head"><span className="dot-panel-status-mark" aria-hidden="true"/><div className="dot-head-copy"><b>Dot <span>· SITE GUIDE</span></b><small><i/> {busy?"Thinking through it":mood==="thinking"?"Considering it":"Here, if you need me"}</small></div><button className={`sound-toggle ${soundOn?"on":""}`} onClick={onToggleSound} title={soundOn?"Turn interaction sounds off":"Turn interaction sounds on"}>{soundOn?<Volume2 size={15}/>:<VolumeX size={15}/>}</button><button className="dot-panel-close" onClick={()=>onOpenChange(false)} aria-label="Close Dot assistant"><X size={17}/></button></header>
      <div className="dot-panel-intro"><span>YOUR INTERACTIVE COMPANION</span><h3>A little context.<br/><em>A better first look.</em></h3><p>Ask about the work, or let Dot wander through the site.</p><button onClick={()=>{updateMood("idle");onOpenChange(false);dismissWelcome();onStartTour();}}><Play size={12} fill="currentColor"/> LET DOT EXPLORE <ArrowRight size={13}/></button></div>
      <div className="dot-messages" aria-live="polite">{messages.slice(-5).map((m,i)=><div className={`dot-message ${m.role}`} key={`${i}-${m.content.slice(0,16)}`}><span>{m.role==="assistant"?"DOT":"YOU"}</span><p>{m.content}</p></div>)}{busy&&<div className="dot-thinking"><i/><i/><i/> Dot is thinking</div>}</div>
      <div className="dot-suggestions"><button onClick={()=>void send("Which projects should I explore first?")}>Best projects <ArrowUpRight size={11}/></button><button onClick={()=>void send("Tell me about Areeb's background")}>About Areeb <ArrowUpRight size={11}/></button><button onClick={()=>void send("What technologies does he work with?")}>Tech stack <ArrowUpRight size={11}/></button></div>
      <form className="dot-composer" onSubmit={onSubmit}><input ref={inputRef} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={onInputKey} placeholder="Ask Dot something…" aria-label="Ask Dot something"/><button disabled={!value.trim()||busy} aria-label="Send message"><Send size={15}/></button></form>
      <div className="dot-panel-foot">DOT / LOCAL GUIDE · OPENROUTER OPTIONAL · NO TRACKING</div>
    </section>}
  </>;
}
function ToolkitStrip() {
  const [dragged,setDragged]=useState("");
  const railRef=useRef<HTMLDivElement>(null);
  const dragRef=useRef<{element:HTMLButtonElement;pointerId:number;startX:number;startY:number;lastX:number;lastY:number;lastAt:number;velocityX:number;velocityY:number;dx:number;dy:number}|null>(null);

  const throwTool=(element:HTMLElement,impulseX=0,impulseY=-34,startX=0,startY=0)=>{
    element.getAnimations().forEach(animation=>animation.cancel());
    const travelX=Math.max(-74,Math.min(74,impulseX+24));
    const travelY=Math.max(-72,Math.min(20,impulseY));
    const spin=travelX>=0?-13:13;
    const startRotation=Math.max(-12,Math.min(12,startX*.12));
    element.animate([
      {transform:`translate3d(${startX}px,${startY}px,0) rotate(${startRotation}deg) scale(1.02)`,offset:0},
      {transform:`translate3d(${travelX*.72}px,${travelY-8}px,0) rotate(${spin}deg) scale(1.07)`,offset:.42},
      {transform:`translate3d(${travelX}px,${travelY+10}px,0) rotate(${-spin*.34}deg) scale(.99)`,offset:.73},
      {transform:"translate3d(0,0,0) rotate(0deg) scale(1)",offset:1},
    ],{duration:1120,easing:"cubic-bezier(.16,.82,.22,1)"});
  };

  useEffect(()=>{
    const rail=railRef.current;
    if(!rail)return;
    const onDotThrow=(event:Event)=>{
      const target=event.target instanceof HTMLElement?event.target.closest<HTMLElement>(".tool-chip"):null;
      if(!target||!rail.contains(target))return;
      throwTool(target,Math.random()>.5?16:-16,-43);
    };
    rail.addEventListener("dot:throw",onDotThrow);
    return ()=>{
      rail.removeEventListener("dot:throw",onDotThrow);
      const drag=dragRef.current;
      if(drag){
        try{drag.element.releasePointerCapture(drag.pointerId);}catch{/* capture may already be released */}
        drag.element.style.transform="";
        drag.element.style.zIndex="";
        dragRef.current=null;
      }
    };
  },[]);

  const onPointerDown=(event:ReactPointerEvent<HTMLButtonElement>,tag:string)=>{
    // Preserve native touch scrolling; the throw gesture remains a desktop pointer action.
    if(event.pointerType==="touch" || window.matchMedia("(hover: none)").matches)return;
    if(event.button!==0)return;
    event.preventDefault();
    const element=event.currentTarget;
    element.setPointerCapture(event.pointerId);
    dragRef.current={element,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,lastAt:performance.now(),velocityX:0,velocityY:0,dx:0,dy:0};
    setDragged(tag);
  };
  const onPointerMove=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId||drag.element!==event.currentTarget)return;
    const now=performance.now();
    const deltaTime=Math.max(8,now-drag.lastAt);
    drag.velocityX=(event.clientX-drag.lastX)/deltaTime;
    drag.velocityY=(event.clientY-drag.lastY)/deltaTime;
    drag.dx=event.clientX-drag.startX;
    drag.dy=event.clientY-drag.startY;
    drag.lastX=event.clientX;
    drag.lastY=event.clientY;
    drag.lastAt=now;
    const rotation=Math.max(-12,Math.min(12,drag.dx*.12));
    drag.element.style.transform=`translate3d(${drag.dx}px,${drag.dy}px,0) rotate(${rotation}deg)`;
    drag.element.style.zIndex="8";
  };
  const onPointerUp=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId||drag.element!==event.currentTarget)return;
    dragRef.current=null;
    try{drag.element.releasePointerCapture(event.pointerId);}catch{/* capture may already be released */}
    const velocityX=Math.max(-.7,Math.min(.7,drag.velocityX));
    const velocityY=Math.max(-.7,Math.min(.7,drag.velocityY));
    const impulseX=drag.dx+velocityX*82;
    const impulseY=drag.dy+velocityY*82-24;
    drag.element.style.zIndex="";
    throwTool(drag.element,impulseX,impulseY,drag.dx,drag.dy);
    drag.element.style.transform="";
    setDragged("");
  };
  const onPointerCancel=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    dragRef.current=null;
    drag.element.style.transform="";
    drag.element.style.zIndex="";
    setDragged("");
  };

  return <section className="toolkit-section" id="toolkit">
    <div className="toolkit-head section-wrap"><div><p className="eyebrow"><span>04</span> THE TOOLBOX</p><h2>Tools I <em>reach for.</em></h2></div><p>Drag and throw a tag around. These are tools and areas I've worked with or explored—not a scoreboard.</p></div>
    <div className="toolkit-rail" ref={railRef} aria-label="Draggable technology tags">{toolkit.map((tag,i)=><button key={tag} type="button" data-tool-chip={tag} onPointerDown={event=>onPointerDown(event,tag)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} className={`tool-chip ${dragged===tag?"dragged":""}`} style={{"--chip-i":i} as CSSProperties} onClick={event=>{if(window.matchMedia("(hover: none)").matches)throwTool(event.currentTarget,Math.random()>.5?10:-10,-24);}}>{tag}<span>✳</span></button>)}</div>
    <div className="toolkit-bottom section-wrap"><span>DRAG / THROW THE TOOLS <ArrowRight size={12}/></span><span>18 ITEMS / NO FAKE PROFICIENCY SCORES</span></div>
  </section>;
}

function KnightGame({ onClose }: { onClose:()=>void }) {
  const path=[[0,0],[1,2],[0,4],[2,3],[4,4],[3,2],[4,0],[2,1],[0,2]];
  const [step,setStep]=useState(0);
  const [wrong,setWrong]=useState(false);
  const done=step===path.length-1;
  const clickCell=(r:number,c:number)=>{
    if(done)return;
    const [nr,nc]=path[step+1];
    if(nr===r&&nc===c){setStep(v=>v+1);setWrong(false);} else {setWrong(true);window.setTimeout(()=>setWrong(false),500);}
  };
  return <div className="game-backdrop" role="presentation" onClick={onClose}><div className="game-modal" role="dialog" aria-modal="true" aria-labelledby="game-title" onClick={e=>e.stopPropagation()}>
    <div className="game-head"><span>DOT'S SIDE QUEST / 001</span><button onClick={onClose} aria-label="Close game"><X size={18}/></button></div>
    <div className="game-copy"><p className="eyebrow">A SMALL CHESS BREAK</p><h2 id="game-title">The knight's<br/><em>little route.</em></h2><p>Move the knight through the marked route. Every move is a legal knight move. Find the next square and finish the eight-step path.</p><div className="game-progress"><span>{done?"ROUTE COMPLETE":`MOVE ${step} / 8`}</span><div>{path.slice(0,-1).map((_,i)=><i className={i<step?"done":""} key={i}/>)}</div></div></div>
    <div className={`mini-board ${wrong?"wrong-move":""}`}>{Array.from({length:25},(_,i)=>{const r=Math.floor(i/5),c=i%5;const onRoute=path.slice(0,step+1).some(([pr,pc])=>pr===r&&pc===c);const current=path[step][0]===r&&path[step][1]===c;return <button key={i} className={`${(r+c)%2?"dark":"light"} ${onRoute?"visited":""} ${current?"current":""}`} onClick={()=>clickCell(r,c)} aria-label={`Row ${r+1}, column ${c+1}`}>{current?"♞":onRoute?<span>{path.findIndex(([pr,pc])=>pr===r&&pc===c)+1}</span>:""}</button>;})}</div>
    <div className="game-foot"><span>{done?"NICE ROUTE. THAT'S A CLEAN FINISH.":"TIP: A knight moves in an L. No diagonal shortcuts."}</span><button onClick={()=>setStep(0)}>RESET <ArrowRight size={13}/></button></div>
  </div></div>;
}

type PortfolioExperienceProps = {
  soundOn: boolean;
  onToggleSound: () => void;
  playSound: (cue: DotSoundCue) => void;
  showDotGuide: boolean;
  entryLeaving: boolean;
};

export default function PortfolioExperience({ soundOn, onToggleSound, playSound, showDotGuide, entryLeaving, autoTourEnabled }: PortfolioExperienceProps) {
  const [menuOpen,setMenuOpen]=useState(false);
  const [activeSection,setActiveSection]=useState("top");
  const [selectedProject,setSelectedProject]=useState<Project|null>(null);
  const [openFaq,setOpenFaq]=useState<number>(-1);
  const [showGame,setShowGame]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [touring,setTouring]=useState(false);
  const [tourPaused,setTourPaused]=useState(false);
  const [tourTimeLeft,setTourTimeLeft]=useState(Math.ceil(DOT_EXPLORATION_DURATION_MS / 1000));
  const [tourClockVisible,setTourClockVisible]=useState(false);
  const [tourPrompt,setTourPrompt]=useState(false);
  const [tourPopup,setTourPopup]=useState<{ message:string; position:DotMicroPopupPosition; tone:"dark"|"light" }|null>(null);
  const [dotMode,setDotMode]=useState<"docked"|"touring"|"docking">("docked");
  const [dotCharacterScale,setDotCharacterScale]=useState(1);
  const [dotPosition,setDotPosition]=useState<{x:number;y:number}|null>(null);
  const [dotMood,setDotMood]=useState<"idle"|"curious"|"thinking"|"playful">("idle");
  const [emailCopied,setEmailCopied]=useState(false);
  const contactEmail=process.env.NEXT_PUBLIC_CONTACT_EMAIL||"";
  const projectRef=useRef<HTMLDivElement>(null);
  const tourRouteRef=useRef<DotTourBeat[]>([]);
  const tourNextIndexRef=useRef(0);
  const tourActiveRef=useRef(false);
  // Guards the automatic first-arrival tour so the effect cannot start it twice.
  const autoTourStartedRef=useRef(false);
  const tourPausedRef=useRef(false);
  const tourTimerRef=useRef<number|null>(null);
  const tourCountdownIntervalRef=useRef<number|null>(null);
  const tourDeadlineRef=useRef<number|null>(null);
  const tourRemainingMsRef=useRef(DOT_EXPLORATION_DURATION_MS);
  const tourClockStartedRef=useRef(false);
  const finishTourRef=useRef<() => void>(() => {});
  const tourMoveTimerRef=useRef<number|null>(null);
  const tourActionTimerRef=useRef<number|null>(null);
  const tourScrollFrameRef=useRef<number|null>(null);
  const tourTransientTimersRef=useRef<number[]>([]);
  const tourAnimationsRef=useRef<Animation[]>([]);
  const tourWaitCancelsRef=useRef<Array<() => void>>([]);
  const tourGenerationRef=useRef(0);
  const dotGuideElementRef=useRef<HTMLElement|null>(null);
  const dotMotionRef=useRef<DotMotionController|null>(null);
  const dotCharacterScaleRef=useRef(1);
  const changeDotCharacterScale=(scale:number)=>{
    const next=Math.max(1,Math.min(2.4,scale));
    dotCharacterScaleRef.current=next;
    setDotCharacterScale(next);
  };

  useEffect(()=>{
    const controller=new DotMotionController(()=>dotGuideElementRef.current);
    dotMotionRef.current=controller;
    return ()=>{
      controller.destroy();
      dotMotionRef.current=null;
    };
  },[]);

  useEffect(()=>{
    const sections=["top","capabilities","crew","process","lab","achievements","toolkit","about","faq","contact"];
    const nodes=sections.map(id=>document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible)setActiveSection(visible.target.id);
    },{rootMargin:"-30% 0px -55% 0px",threshold:[0,.15,.35,.55]});
    nodes.forEach(n=>observer.observe(n));
    return ()=>observer.disconnect();
  },[]);

  // Section changes inform the tour's next starting point without decorating
  // the page with an artificial marker.
  const previousSectionRef = useRef(activeSection);
  useEffect(()=>{
    if(previousSectionRef.current !== activeSection) playSound("section");
    previousSectionRef.current = activeSection;
  },[activeSection,playSound]);

  useEffect(()=>{
    const nodes=document.querySelectorAll<HTMLElement>(".reveal");
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){nodes.forEach(n=>n.classList.add("visible"));return;}
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target);}}),{threshold:.12,rootMargin:"0px 0px -5% 0px"});
    nodes.forEach(n=>observer.observe(n)); return ()=>observer.disconnect();
  },[]);

  const scheduleTourTransient=(callback:()=>void, delay:number)=>{
    const timer=window.setTimeout(()=>{
      tourTransientTimersRef.current=tourTransientTimersRef.current.filter(value=>value!==timer);
      callback();
    },delay);
    tourTransientTimersRef.current.push(timer);
    return timer;
  };

  const tourIsCurrent=(generation:number)=>generation===tourGenerationRef.current&&tourActiveRef.current&&!tourPausedRef.current;

  const waitForTour=(duration:number,generation:number)=>new Promise<boolean>(resolve=>{
    let timer=0;
    let settled=false;
    const finish=(allowed:boolean)=>{
      if(settled)return;
      settled=true;
      window.clearTimeout(timer);
      tourTransientTimersRef.current=tourTransientTimersRef.current.filter(value=>value!==timer);
      tourWaitCancelsRef.current=tourWaitCancelsRef.current.filter(cancel=>cancel!==cancelWait);
      resolve(allowed&&tourIsCurrent(generation));
    };
    const cancelWait=()=>finish(false);
    tourWaitCancelsRef.current.push(cancelWait);
    timer=window.setTimeout(()=>finish(true),Math.max(0,duration));
    tourTransientTimersRef.current.push(timer);
  });

  const animateTourElement=(element:Element|null,keyframes:Keyframe[],options:KeyframeAnimationOptions)=>{
    if(!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    const animation=element.animate(keyframes,options);
    tourAnimationsRef.current.push(animation);
    const remove=()=>{tourAnimationsRef.current=tourAnimationsRef.current.filter(value=>value!==animation);};
    animation.onfinish=remove;
    animation.oncancel=remove;
    return animation;
  };

  const clearTourTimers=()=>{
    tourGenerationRef.current+=1;
    setTourPopup(null);
    dotMotionRef.current?.stop();
    if(tourTimerRef.current!==null) window.clearTimeout(tourTimerRef.current);
    if(tourCountdownIntervalRef.current!==null) window.clearInterval(tourCountdownIntervalRef.current);
    tourCountdownIntervalRef.current=null;
    tourDeadlineRef.current=null;
    if(tourMoveTimerRef.current!==null) window.clearTimeout(tourMoveTimerRef.current);
    if(tourActionTimerRef.current!==null) window.clearTimeout(tourActionTimerRef.current);
    if(tourScrollFrameRef.current!==null) window.cancelAnimationFrame(tourScrollFrameRef.current);
    tourTransientTimersRef.current.forEach(timer=>window.clearTimeout(timer));
    tourTransientTimersRef.current=[];
    const pendingCancels=[...tourWaitCancelsRef.current];
    tourWaitCancelsRef.current=[];
    pendingCancels.forEach(cancel=>cancel());
    const runningAnimations=[...tourAnimationsRef.current];
    tourAnimationsRef.current=[];
    runningAnimations.forEach(animation=>animation.cancel());
    document.querySelectorAll<HTMLElement>(".dot-tour-touched,.dot-tour-tool-bounce,.dot-ticker-disturbed,.dot-crew-chain,.dot-process-chain,.dot-faq-burst,.dot-faq-list-scattered,.dot-project-fan").forEach(node=>{
      node.classList.remove("dot-tour-touched","dot-tour-tool-bounce","dot-ticker-disturbed","dot-crew-chain","dot-process-chain","dot-faq-burst","dot-faq-list-scattered","dot-project-fan");
    });
    document.querySelectorAll<HTMLElement>(".ticker-track").forEach(node=>{node.style.animationDuration="";node.style.animationDirection="";});
    tourTimerRef.current=null; tourMoveTimerRef.current=null; tourActionTimerRef.current=null; tourScrollFrameRef.current=null;
  };

  const stopTourClock=(preserveRemaining:boolean)=>{
    tourClockStartedRef.current=false;
    if(preserveRemaining && tourDeadlineRef.current!==null){
      tourRemainingMsRef.current=Math.max(0,tourDeadlineRef.current-Date.now());
      setTourTimeLeft(Math.ceil(tourRemainingMsRef.current/1000));
    }
    if(tourCountdownIntervalRef.current!==null) window.clearInterval(tourCountdownIntervalRef.current);
    tourCountdownIntervalRef.current=null;
    tourDeadlineRef.current=null;
  };

  const startTourClock=(remainingMs:number)=>{
    stopTourClock(false);
    tourClockStartedRef.current=true;
    setTourClockVisible(true);
    tourRemainingMsRef.current=Math.max(0,remainingMs);
    tourDeadlineRef.current=Date.now()+tourRemainingMsRef.current;
    let lastSecond=-1;
    const tick=()=>{
      if(tourDeadlineRef.current===null)return;
      const remaining=Math.max(0,tourDeadlineRef.current-Date.now());
      tourRemainingMsRef.current=remaining;
      const seconds=Math.ceil(remaining/1000);
      if(seconds!==lastSecond){lastSecond=seconds;setTourTimeLeft(seconds);}
      if(remaining<=0){
        tourClockStartedRef.current=false;
        if(tourCountdownIntervalRef.current!==null)window.clearInterval(tourCountdownIntervalRef.current);
        tourCountdownIntervalRef.current=null;
        tourDeadlineRef.current=null;
        finishTourRef.current();
      }
    };
    tick();
    if(tourDeadlineRef.current!==null)tourCountdownIntervalRef.current=window.setInterval(tick,200);
  };

  const getDotDestination=(target:Element)=>{
    const rect=target.getBoundingClientRect();
    const {width:vw,height:vh}=getVisibleViewport();
    const mobile=vw<=720;
    const size=(mobile?92:132)*dotCharacterScaleRef.current;
    const radius=size/2+10;
    const gap=mobile?20:30;
    const canFitLeft=rect.left-radius-gap>=12;
    const canFitRight=rect.right+radius+gap<=vw-12;
    let x:number;
    if(canFitRight&&(!canFitLeft||rect.left<vw*.55))x=rect.right+radius+gap;
    else if(canFitLeft)x=rect.left-radius-gap;
    else x=rect.left>vw*.5?Math.max(radius+12,rect.left-radius-gap):Math.min(vw-radius-12,rect.right+radius+gap);
    let y=rect.top+Math.min(Math.max(rect.height*.34,38),Math.min(105,rect.height*.6));
    x=Math.max(radius+10,Math.min(vw-radius-10,x));
    y=Math.max(radius+26,Math.min(vh-radius-64,y));
    return {x,y};
  };

  const getPopupPosition=():DotMicroPopupPosition=>{
    const mascot=dotGuideElementRef.current?.querySelector<HTMLElement>(".dot-mascot");
    const rect=(mascot??dotGuideElementRef.current)?.getBoundingClientRect();
    const {width:viewportWidth,height:viewportHeight}=getVisibleViewport();
    if(!rect)return {x:viewportWidth*.5,y:viewportHeight*.25,side:"below"};
    const width=Math.min(224,Math.max(120,viewportWidth-24));
    const x=Math.max(width/2+12,Math.min(viewportWidth-width/2-12,rect.left+rect.width/2));
    const popupHeight=Math.min(120,Math.max(76,viewportHeight*.18));
    const roomBelow=viewportHeight-rect.bottom;
    const roomAbove=rect.top;
    const side:DotMicroPopupPosition["side"] = roomBelow>=popupHeight+16
      ? "below"
      : roomAbove>=popupHeight+16
        ? "above"
        : roomBelow>=roomAbove ? "below" : "above";
    const y=side==="below"
      ? Math.max(12,Math.min(viewportHeight-popupHeight-12,rect.bottom+12))
      : Math.max(popupHeight+12,Math.min(viewportHeight-12,rect.top-12));
    return {x,y,side};
  };

  useEffect(()=>{
    const repositionPopup=()=>{
      setTourPopup(current=>current?{...current,position:getPopupPosition()}:current);
    };
    window.addEventListener("resize",repositionPopup,{passive:true});
    window.addEventListener("orientationchange",repositionPopup,{passive:true});
    window.visualViewport?.addEventListener("resize",repositionPopup,{passive:true});
    return ()=>{
      window.removeEventListener("resize",repositionPopup);
      window.removeEventListener("orientationchange",repositionPopup);
      window.visualViewport?.removeEventListener("resize",repositionPopup);
    };
  },[]);

  const moveDotNear=async(target:Element)=>{
    const destination=getDotDestination(target);
    return dotMotionRef.current?.moveTo(destination.x,destination.y,{maxDuration:7600,maxSpeed:440,stiffness:27,damping:10.5,curve:.16})??false;
  };

  const waitForScrollSettle=async(generation:number,horizontalScroller?:HTMLElement|null)=>{
    let previousY=window.scrollY;
    let previousX=window.scrollX;
    let previousRailX=horizontalScroller?.scrollLeft??0;
    let calmSamples=0;
    let elapsed=0;
    while(elapsed<2200){
      const active=await waitForTour(90,generation);
      if(!active)return false;
      const currentY=window.scrollY;
      const currentX=window.scrollX;
      const currentRailX=horizontalScroller?.scrollLeft??0;
      const settled=Math.abs(currentY-previousY)<0.9
        &&Math.abs(currentX-previousX)<0.9
        &&Math.abs(currentRailX-previousRailX)<0.9;
      calmSamples=settled?calmSamples+1:0;
      previousY=currentY;
      previousX=currentX;
      previousRailX=currentRailX;
      elapsed+=90;
      if(calmSamples>=3)return true;
    }
    return tourIsCurrent(generation);
  };

  const performTourInteraction=async(beat:DotTourBeat,generation:number,interactionTarget:Element|null)=>{
    const section=document.getElementById(beat.id);
    if(!section)return false;
    const touched=(element:Element|null)=>{
      if(!element)return;
      element.classList.add("dot-tour-touched");
      scheduleTourTransient(()=>element.classList.remove("dot-tour-touched"),1900);
    };

    if(beat.action==="headline"){
      const ticker=document.querySelector<HTMLElement>(".ticker");
      const tickerTrack=ticker?.querySelector<HTMLElement>(".ticker-track");
      if(ticker&&tickerTrack){
        touched(ticker);
        // Dot catches the real marquee and gives it a burst of speed. The
        // authored 38s loop is restored as soon as the interaction resolves.
        playSound("text");
        ticker.classList.add("dot-ticker-disturbed");
        tickerTrack.style.animationDuration="4.8s";
        tickerTrack.style.animationDirection="reverse";
        tickerTrack.style.animationTimingFunction="linear";
        const active=await waitForTour(2650,generation);
        tickerTrack.style.animationDuration="";
        tickerTrack.style.animationDirection="";
        tickerTrack.style.animationTimingFunction="";
        ticker.classList.remove("dot-ticker-disturbed");
        return active&&tourIsCurrent(generation);
      }
      return waitForTour(700,generation);
    }

    if(beat.action==="capability"){
      const tabs=Array.from(section.querySelectorAll<HTMLButtonElement>(".cap-tab"));
      const tab=interactionTarget instanceof HTMLButtonElement?interactionTarget:tabs.find(item=>!item.classList.contains("active"))||tabs[0]||null;
      if(tab){tab.click();touched(tab);playSound("interaction");}
      return waitForTour(1050,generation);
    }

    if(beat.action==="crew"){
      const cards=Array.from(section.querySelectorAll<HTMLElement>(".crew-card"));
      const chosen=interactionTarget instanceof HTMLButtonElement?interactionTarget:cards[0]||null;
      // One nudge travels through the real project-card stack like a domino
      // ripple before Dot opens the card it picked.
      cards.forEach((card,index)=>{
        const tilt=(index%2===0?-1:1)*(2.2+index*.35);
        const animation=animateTourElement(card,[
          {transform:"translate3d(0,0,0) rotate(0deg)"},
          {transform:`translate3d(${index%2===0?-8:8}px,-13px,0) rotate(${tilt}deg)`},
          {transform:"translate3d(0,0,0) rotate(0deg)"},
        ],{duration:980,delay:index*85,easing:"cubic-bezier(.2,.82,.2,1)"});
        if(animation)animation.onfinish=()=>{tourAnimationsRef.current=tourAnimationsRef.current.filter(value=>value!==animation);};
      });
      playSound("interaction");
      const ripple=await waitForTour(650,generation);
      if(!ripple||!tourIsCurrent(generation))return false;
      if(chosen){setTourPopup(null);touched(chosen);chosen.click();playSound("land");}
      const active=await waitForTour(1900,generation);
      if(active)document.querySelector<HTMLButtonElement>(".project-modal-top button")?.click();
      return active;
    }

    if(beat.action==="project"){
      const cards=Array.from(section.querySelectorAll<HTMLElement>(".project-card"));
      const buttons=Array.from(section.querySelectorAll<HTMLButtonElement>(".project-open"));
      const chosen=interactionTarget instanceof HTMLButtonElement?interactionTarget:buttons[0]||null;
      cards.slice(0,Math.min(cards.length,5)).forEach((card,i)=>{
        animateTourElement(card,[
          {transform:"translateY(0) rotate(0deg)"},
          {transform:`translateY(${i%2?-7:-12}px) rotate(${i%2?1.1:-1.1}deg)`},
          {transform:"translateY(0) rotate(0deg)"},
        ],{duration:820,delay:i*75,easing:"cubic-bezier(.2,.82,.2,1)"});
      });
      playSound("interaction");
      const fanned=await waitForTour(480,generation);
      if(!fanned||!tourIsCurrent(generation))return false;
      if(chosen){setTourPopup(null);touched(chosen);chosen.click();playSound("land");}
      const active=await waitForTour(2050,generation);
      if(active)document.querySelector<HTMLButtonElement>(".project-modal-top button")?.click();
      return active;
    }

    if(beat.action==="process"){
      const cards=Array.from(section.querySelectorAll<HTMLElement>(".process-card"));
      cards.forEach((card,index)=>{
        card.classList.add("dot-process-chain");
        scheduleTourTransient(()=>card.classList.remove("dot-process-chain"),1550+index*120);
        animateTourElement(card,[
          {transform:"translateY(0) scale(1)"},
          {transform:"translateY(-14px) scale(1.018)"},
          {transform:"translateY(0) scale(1)"},
        ],{duration:760,delay:index*190,easing:"cubic-bezier(.16,.84,.24,1)"});
      });
      playSound("interaction");
      return waitForTour(1480,generation);
    }

    if(beat.action==="toolkit"){
      const chips=Array.from(section.querySelectorAll<HTMLElement>(".tool-chip"));
      const chip=interactionTarget instanceof HTMLElement&&interactionTarget.matches(".tool-chip")?interactionTarget:chips[0]||null;
      if(chip){
        // Reuse the pointer-throw engine that the visitor uses on this exact tag.
        chip.dispatchEvent(new CustomEvent("dot:throw",{bubbles:true,detail:{source:"dot"}}));
        touched(chip);
        playSound("text");
      }
      return waitForTour(1350,generation);
    }

    if(beat.action==="achievements"){
      const cards=Array.from(section.querySelectorAll<HTMLElement>(".achievement-card"));
      const chosen=interactionTarget instanceof HTMLElement?interactionTarget:cards[0]||null;
      cards.slice(0,4).forEach((card,index)=>{
        animateTourElement(card,[
          {transform:"translateY(0) rotate(0deg)"},
          {transform:`translateY(${index%2?-7:-10}px) rotate(${index%2?0.8:-0.8}deg)`},
          {transform:"translateY(0) rotate(0deg)"},
        ],{duration:760,delay:index*130,easing:"cubic-bezier(.16,.84,.24,1)"});
      });
      touched(chosen);
      playSound("interaction");
      return waitForTour(1450,generation);
    }

    if(beat.action==="about"){
      const monogram=section.querySelector<HTMLElement>(".about-monogram");
      touched(monogram);
      animateTourElement(monogram,[
        {transform:"rotate(0deg) scale(1)"},
        {transform:"rotate(8deg) scale(1.055)"},
        {transform:"rotate(-5deg) scale(.985)"},
        {transform:"rotate(0deg) scale(1)"},
      ],{duration:1180,easing:"cubic-bezier(.2,.8,.2,1)"});
      playSound("interaction");
      return waitForTour(1120,generation);
    }

    if(beat.action==="faq"){
      const faqSection=section;
      const words=Array.from(faqSection.querySelectorAll<HTMLElement>(".faq-word"));
      const faqList=faqSection.querySelector<HTMLElement>(".faq-list");
      faqSection.classList.add("dot-faq-burst");
      const animations:Animation[]=[];
      words.forEach((word,index)=>{
        const dx=(Math.random()-.5)*Math.min(340,window.innerWidth*.42);
        const dy=105+Math.random()*Math.min(240,window.innerHeight*.34);
        const rotate=(Math.random()-.5)*100;
        const animation=word.animate([
          {transform:"translate3d(0,0,0) rotate(0deg) scale(1)",opacity:1},
          {transform:`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) rotate(${rotate.toFixed(1)}deg) scale(.92)`,opacity:.92},
        ],{duration:1650+Math.random()*350,delay:(index%13)*18,easing:"cubic-bezier(.2,.72,.28,1)",fill:"forwards"});
        animations.push(animation);
        tourAnimationsRef.current.push(animation);
        const remove=()=>{tourAnimationsRef.current=tourAnimationsRef.current.filter(value=>value!==animation);};
        animation.onfinish=remove;
        animation.oncancel=remove;
      });
      faqList?.classList.add("dot-faq-list-scattered");
      playSound("scatter");
      const active=await waitForTour(2450,generation);
      animations.forEach(animation=>animation.cancel());
      faqSection.classList.remove("dot-faq-burst");
      faqList?.classList.remove("dot-faq-list-scattered");
      return active&&tourIsCurrent(generation);
    }

    if(beat.action==="contact"){
      const stamp=section.querySelector<HTMLElement>(".contact-stamp");
      touched(stamp);
      animateTourElement(stamp,[
        {transform:"rotate(0deg) scale(1)"},
        {transform:"rotate(-12deg) scale(1.08)"},
        {transform:"rotate(13deg) scale(1.025)"},
        {transform:"rotate(0deg) scale(1)"},
      ],{duration:1280,easing:"cubic-bezier(.2,.8,.2,1)"});
      playSound("land");
      return waitForTour(1280,generation);
    }
    return true;
  };
  const finishTour=()=>{
    const completedNaturally=tourRemainingMsRef.current<=0;
    const currentRect=dotGuideElementRef.current?.getBoundingClientRect();
    const currentPosition=currentRect?{x:currentRect.left+currentRect.width/2,y:currentRect.top+currentRect.height/2}:null;
    clearTourTimers();
    const generation=tourGenerationRef.current;
    tourActiveRef.current=false;
    tourPausedRef.current=false;
    tourRemainingMsRef.current=0;
    tourClockStartedRef.current=false;
    setTourClockVisible(false);
    setTourTimeLeft(0);
    setTouring(false);
    setTourPopup(null);
    tourRouteRef.current=[];
    tourNextIndexRef.current=0;
    setTourPaused(false);setTourPrompt(false);setAssistantOpen(false);
    setSelectedProject(null);setShowGame(false);
    // A completed automatic tour should finish at the real footer instead of
    // leaving the viewport parked halfway through the horizontally-scrolling toolbox.
    if(completedNaturally) {
      document.querySelector<HTMLElement>(".footer")?.scrollIntoView({
        behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",
        block:"end",
      });
    }

    const {width:viewportWidth,height:viewportHeight}=getVisibleViewport();
    const mobile=viewportWidth<=720;
    const dockSize=mobile?74:94;
    const targetX=viewportWidth-(mobile?12:24)-dockSize/2;
    const targetY=viewportHeight-(mobile?14:22)-dockSize/2;
    const start=currentPosition??{x:targetX,y:targetY};
    changeDotCharacterScale(1);
    setDotMode("docking");
    setDotPosition(start);
    setDotMood("thinking");
    setTourPopup(null);
    playSound("move");
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      setDotMode("docked");setDotPosition(null);setDotMood("idle");setTouring(false);
      return;
    }
    tourMoveTimerRef.current=window.setTimeout(()=>{
      if(generation!==tourGenerationRef.current)return;
      const moveHome=(attempt:number)=>{
        const {width:viewportWidth,height:viewportHeight}=getVisibleViewport();
        const mobileNow=viewportWidth<=720;
        const homeX=viewportWidth-(mobileNow?12:24)-(mobileNow?74:94)/2;
        const homeY=viewportHeight-(mobileNow?14:22)-(mobileNow?74:94)/2;
        void (dotMotionRef.current?.moveTo(homeX,homeY,{maxDuration:attempt===0?9800:12500,maxSpeed:attempt===0?470:420,stiffness:attempt===0?25:22,damping:10.2,curve:.09})??Promise.resolve(false)).then((arrived)=>{
          if(generation!==tourGenerationRef.current)return;
          if(!arrived&&attempt<2){
            // Re-evaluate the current position and make a fresh curved attempt.
            // Dot remains rendered at its actual coordinates throughout.
            tourMoveTimerRef.current=window.setTimeout(()=>moveHome(attempt+1),260);
            return;
          }
          if(!arrived){
            const rect=dotGuideElementRef.current?.getBoundingClientRect();
            if(rect)setDotPosition({x:rect.left+rect.width/2,y:rect.top+rect.height/2});
            setDotMode("touring");
            setDotMood("idle");
            return;
          }
          setDotMode("docked");
          setDotPosition(null);
          setDotMood("idle");
          setTouring(false);
          playSound("land");
        });
      };
      moveHome(0);
    },70);
  };

  finishTourRef.current=finishTour;

  const runTourBeat=async(index:number)=>{
    if(!tourActiveRef.current||tourPausedRef.current)return;
    const generation=tourGenerationRef.current;
    const beat=tourRouteRef.current[index];
    if(!beat){
      // The countdown defines the session length. If the curated interaction
      // circuit finishes early, start another varied pass rather than ending
      // the overview before its 1:55 window has elapsed.
      if(tourRemainingMsRef.current>0 && tourRouteRef.current.length){
        const route=tourRouteRef.current;
        const offset=route.length>1?1+Math.floor(Math.random()*(route.length-1)):0;
        tourRouteRef.current=[...route.slice(offset),...route.slice(0,offset)];
        tourNextIndexRef.current=0;
        setDotMood("curious");
        const reset=await waitForTour(1050,generation);
        if(reset&&tourIsCurrent(generation))void runTourBeat(0);
      } else finishTour();
      return;
    }
    tourNextIndexRef.current=index;
    setTourPopup(null);
    // Keep Dot compact while travelling. Reference-style emphasis happens
    // only once it reaches the interaction and settles.
    changeDotCharacterScale(1);
    const moodByAction:Record<DotTourBeat["action"],typeof dotMood>={
      headline:"playful",capability:"curious",crew:"curious",project:"curious",process:"thinking",toolkit:"playful",about:"idle",achievements:"playful",faq:"thinking",contact:"curious",
    };
    setDotMood("thinking");
    playSound("move");

    const section=document.getElementById(beat.id);
    const pickTarget=():Element|null=>{
      if(!section)return null;
      const scope:ParentNode=beat.id==="top"?document:section;
      let candidates=beat.selector?Array.from(scope.querySelectorAll<HTMLElement>(beat.selector)):[];
      if(beat.action==="capability"){
        const inactive=candidates.filter(candidate=>!candidate.classList.contains("active"));
        if(inactive.length)candidates=inactive;
      }
      if(beat.action==="crew")candidates=candidates.slice(0,4);
      if(beat.action==="project")candidates=candidates.slice(0,5);
      if(candidates.length)return candidates[Math.floor(Math.random()*candidates.length)];
      return section;
    };
    const target=pickTarget();
    if(!section||!target){
      setTourPopup(null);
      const recovered=await waitForTour(650,generation);
      if(recovered){tourNextIndexRef.current=index+1;void runTourBeat(index+1);}
      return;
    }

    // Scroll only when the real interaction target is outside the comfortable viewport.
    const rect=target.getBoundingClientRect();
    const {height:viewportHeight}=getVisibleViewport();
    const needsScroll=rect.top<96||rect.bottom>viewportHeight-112;
    const toolkitRail=beat.action==="toolkit"?target.closest<HTMLElement>(".toolkit-rail"):null;
    if(needsScroll || toolkitRail) {
      target.scrollIntoView({
        behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",
        block:toolkitRail?"nearest":"center",
        inline:toolkitRail?"center":"nearest",
      });
    }
    const settled=(needsScroll || toolkitRail)
      ?await waitForScrollSettle(generation,toolkitRail)
      :await waitForTour(320,generation);
    if(!settled||!tourIsCurrent(generation))return;

    const liveTarget=target.isConnected?target:pickTarget();
    if(!liveTarget){
      setTourPopup(null);
      const recovered=await waitForTour(550,generation);
      if(recovered){tourNextIndexRef.current=index+1;void runTourBeat(index+1);}
      return;
    }

    setDotMood("curious");
    // The reference timer begins with Dot's first actual movement, not while
    // the portfolio is still settling or the first target is being scrolled into view.
    if(!tourClockStartedRef.current)startTourClock(tourRemainingMsRef.current);
    const arrived=await moveDotNear(liveTarget);
    if(!tourIsCurrent(generation))return;
    if(!arrived){
      // A timed-out leg must not snap Dot to a destination. Recalculate once;
      // if the target is still unstable, skip this beat and continue exploring.
      const recoverTarget=liveTarget.isConnected?liveTarget:section;
      const recovered=await waitForTour(300,generation);
      if(!recovered||!tourIsCurrent(generation))return;
      const retry=recoverTarget?await moveDotNear(recoverTarget):false;
      if(!retry){
        setTourPopup(null);
        tourNextIndexRef.current=index+1;
        const next=await waitForTour(420,generation);
        if(next&&tourIsCurrent(generation))void runTourBeat(index+1);
        return;
      }
    }
    changeDotCharacterScale(beat.action==="contact"?2.35:beat.action==="faq"?1.12:1);
    setDotMood(moodByAction[beat.action]);
    playSound("land");
    const observe=await waitForTour(900,generation);
    if(!observe||!tourIsCurrent(generation))return;

    // A contextual bubble appears only after Dot has settled. Its screen
    // position is captured from Dot once, so it stays still during the action
    // and is removed before Dot begins the next movement.
    const comment=beat.comments.length?beat.comments[Math.floor(Math.random()*beat.comments.length)]:"";
    if(comment){
        setTourPopup({message:comment,position:getPopupPosition(),tone:"dark"});
    }

    // Arrival is followed by a real reading pause. The action does not fire in
    // the same frame as the bubble; silent moments still get an observation beat.
    const readPauseMs=comment?Math.min(3200,Math.max(1900,1250+comment.length*24)):1150;
    const readPause=await waitForTour(readPauseMs,generation);
    if(!readPause||!tourIsCurrent(generation))return;
    const interacted=await performTourInteraction(beat,generation,liveTarget);
    if(!interacted||!tourIsCurrent(generation))return;
    const reactionPause=await waitForTour(comment?720:520,generation);
    if(!reactionPause||!tourIsCurrent(generation))return;
    setTourPopup(null);
    tourNextIndexRef.current=index+1;
    const pause=await waitForTour(beat.pause,generation);
    if(pause&&tourIsCurrent(generation))void runTourBeat(index+1);
  };

  const startTour=()=>{
    autoTourStartedRef.current=true;
    clearTourTimers();
    setAssistantOpen(false);setTourPrompt(false);setTourPaused(false);setTouring(true);
    tourActiveRef.current=true;
    tourPausedRef.current=false;
    const curatedIds=["top","capabilities","crew","process","lab","toolkit","achievements","about","faq","contact"];
    const curatedRoute=curatedIds.map(id=>DOT_TOUR_BEATS.find(beat=>beat.id===id)).filter(Boolean) as DotTourBeat[];
    const activeIndex=Math.max(0,curatedRoute.findIndex(beat=>beat.id===activeSection));
    // A curated route with one deliberate return keeps the exploration playful
    // without feeling like a mechanical section-by-section table of contents.
    const route=[...curatedRoute.slice(activeIndex),...curatedRoute.slice(0,activeIndex)];
    tourRouteRef.current=route;
    tourNextIndexRef.current=0;
    tourClockStartedRef.current=false;
    setTourClockVisible(false);
    tourRemainingMsRef.current=DOT_EXPLORATION_DURATION_MS;
    setTourTimeLeft(Math.ceil(DOT_EXPLORATION_DURATION_MS/1000));
    changeDotCharacterScale(1);
    const {width:viewportWidth,height:viewportHeight}=getVisibleViewport();
    const mobile=viewportWidth<=720;
    const dockSize=mobile?74:94;
    const initial={x:viewportWidth-(mobile?12:24)-dockSize/2,y:viewportHeight-(mobile?14:22)-dockSize/2};
    setDotMode("touring");
    setDotPosition(initial);
    setDotMood("curious");
    setTourPopup(null);
    playSound("appear");
    const generation=tourGenerationRef.current;
    tourTimerRef.current=window.setTimeout(()=>{
      if(generation!==tourGenerationRef.current||!tourIsCurrent(generation))return;
      void runTourBeat(0);
    },720);
  };

  useEffect(()=>{
    if(!showDotGuide||autoTourStartedRef.current)return;
    // Wait for the entry curtain to clear and the first portfolio frame to settle.
    const timer=window.setTimeout(()=>{
      if(autoTourStartedRef.current||tourActiveRef.current)return;
      startTour();
    },1550);
    return ()=>window.clearTimeout(timer);
  },[showDotGuide,autoTourEnabled]);

  const pauseTourForVisitor=()=>{
    if(!tourActiveRef.current||tourPausedRef.current)return;
    tourPausedRef.current=true;
    stopTourClock(true);
    clearTourTimers();
    // clearTourTimers increments the generation; this beat remains the resume point.
    setTourPaused(true);setTourPrompt(true);
    setDotMood("curious");
    setTourPopup(null);
  };

  const continueTour=()=>{
    if(!tourActiveRef.current)return;
    tourPausedRef.current=false;
    setAssistantOpen(false);setSelectedProject(null);setShowGame(false);
    setDotMood("curious");
    setTourPaused(false);setTourPrompt(false);
    playSound("move");
    const generation=tourGenerationRef.current;
    tourTimerRef.current=window.setTimeout(()=>{
      if(generation===tourGenerationRef.current&&tourIsCurrent(generation))void runTourBeat(tourNextIndexRef.current);
    },380);
  };

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();document.getElementById("command-overlay")?.classList.toggle("show");}
      if(e.key==="Escape"){
        setMenuOpen(false);setSelectedProject(null);setShowGame(false);
        document.getElementById("command-overlay")?.classList.remove("show");
        if(tourActiveRef.current) pauseTourForVisitor();
        else setAssistantOpen(false);
      }
    };
    window.addEventListener("keydown",onKey);return ()=>window.removeEventListener("keydown",onKey);
  },[tourPaused]);

  useEffect(()=>{
    if(!touring || tourPaused) return;
    const isTourControl=(target:EventTarget|null)=>{
      const element=target instanceof Element ? target : null;
      return Boolean(element?.closest(".dot-guide,.dot-overview-prompt,.dot-panel,.dot-tour-clock,.command-overlay"));
    };
    const onManualInput=(event:Event)=>{
      if(isTourControl(event.target)) return;
      pauseTourForVisitor();
    };
    const onKeyInput=(event:KeyboardEvent)=>{
      if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," ","Enter","Tab"].includes(event.key)) pauseTourForVisitor();
    };
    window.addEventListener("wheel",onManualInput,{passive:true,capture:true});
    window.addEventListener("touchstart",onManualInput,{passive:true,capture:true});
    window.addEventListener("pointerdown",onManualInput,true);
    window.addEventListener("keydown",onKeyInput,true);
    return ()=>{
      window.removeEventListener("wheel",onManualInput,true);
      window.removeEventListener("touchstart",onManualInput,true);
      window.removeEventListener("pointerdown",onManualInput,true);
      window.removeEventListener("keydown",onKeyInput,true);
    };
  },[touring,tourPaused]);

  useEffect(()=>()=>clearTourTimers(),[]);

  const handleToggleSound=()=>{
    if(soundOn) setDotMood("idle");
    onToggleSound();
  };

  const tourClockLabel=`${Math.floor(tourTimeLeft/60)}:${String(tourTimeLeft%60).padStart(2,"0")}`;

  const copyEmail=async()=>{if(!contactEmail)return;try{await navigator.clipboard.writeText(contactEmail);setEmailCopied(true);window.setTimeout(()=>setEmailCopied(false),1600);}catch{/* clipboard unavailable */}};

  return <main className="site-root">
    <header className="topbar"><a className="wordmark" href="#top" aria-label="Areeb Khalid, home">areeb<span>✳</span></a><nav id="portfolio-navigation" className={menuOpen?"main-nav open":"main-nav"} aria-label="Main navigation"><a className={activeSection==="lab"?"current":""} href="#lab" onClick={()=>setMenuOpen(false)}>Work</a><a href="#capabilities" onClick={()=>setMenuOpen(false)}>What I build</a><a href="#about" onClick={()=>setMenuOpen(false)}>About</a><a href="#faq" onClick={()=>setMenuOpen(false)}>FAQ</a><a className="nav-contact" href="#contact" onClick={()=>setMenuOpen(false)}>Say hello <ArrowUpRight size={14}/></a></nav><div className="topbar-tools"><button className="sound-control" onClick={handleToggleSound} title={soundOn?"Turn sound off":"Turn sound on for Dot and the guide"} aria-pressed={soundOn}>{soundOn?<Volume2 size={13}/>:<VolumeX size={13}/>} SOUND: {soundOn?"ON":"OFF"}</button><button id="command-trigger" className="command-trigger" aria-label="Open quick navigation" onClick={()=>{const el=document.getElementById("command-overlay");el?.classList.toggle("show");}}><Command size={14}/><span>K</span></button><button className="mobile-menu" type="button" onClick={()=>setMenuOpen(v=>!v)} aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="portfolio-navigation">{menuOpen?<X/>:<Menu/>}</button></div></header>

    <div className="command-overlay" id="command-overlay" onClick={e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove("show");}}><div className="command-box"><div className="command-box-head"><span><Command size={15}/> JUMP TO</span><button onClick={()=>document.getElementById("command-overlay")?.classList.remove("show")}><X size={15}/></button></div>{tourSteps.map((s,i)=><button key={s.id} onClick={()=>{scrollToId(s.id);document.getElementById("command-overlay")?.classList.remove("show");}}><span>0{i+1}</span>{s.title}<ArrowUpRight size={13}/></button>)}</div></div>

    <section className="hero" id="top">
      <div className="hero-noise"/>
      <div className="hero-meta"><span>SOFTWARE ENGINEERING <i>✳</i> AI / ML <i>✳</i> CREATIVE TECHNOLOGY</span><span>NEW DELHI, INDIA · OPEN TO IDEAS</span></div>
      <div className="hero-content"><div className="hero-left"><p className="hero-eyebrow"><i/> A SECOND-YEAR CS & DATA SCIENCE BUILDER</p><h1>I build<br/><span className="hero-word">intelligent<span className="scribble"/></span><br/>things<span className="hero-dot">.</span></h1><div className="hero-under"><a href="#lab" className="hero-cta">EXPLORE THE WORK <ArrowDownRight size={17}/></a><p>Software, AI and systems with a reason to exist.<br/>I build, test and keep improving the idea.</p></div></div>
        <div className="hero-right"><div className="hero-orbit-wrap"><div className="hero-orbit orbit-1"/><div className="hero-orbit orbit-2"/><div className="hero-orbit orbit-3"/><div className="hero-compass"><div className="compass-cross"/><div className="compass-core"><span>AK</span><small>BUILD / THINK / REPEAT</small></div><i className="compass-dot dot-1"/><i className="compass-dot dot-2"/><i className="compass-dot dot-3"/></div><div className="orbit-label label-top">01 / INTELLIGENCE</div><div className="orbit-label label-right">02 / SYSTEMS</div><div className="orbit-label label-bottom">03 / EXPERIENCE</div></div><div className="hero-terminal"><div className="terminal-head"><span><i/><i/><i/></span><b>AREEB / STATUS</b><small>SESSION LIVE</small></div><div className="terminal-body"><p><span>$</span> whoami</p><b>areeb-khalid</b><p><span>$</span> current_focus</p><b>build · test · improve<span className="cursor-blink">_</span></b><div className="terminal-footer"><i/> OPEN TO INTERESTING PROBLEMS <span>↗</span></div></div></div></div>
      </div>
      <div className="hero-bottom"><span>SCROLL TO EXPLORE <ArrowDown size={13}/></span><span>01 — 07 <i>✳</i> PERSONAL PORTFOLIO / 2026</span></div>
    </section>

    <div className="ticker" aria-label="Areas of interest"><div className="ticker-track">{Array.from({length:2}).map((_,i)=><span key={i}>ARTIFICIAL INTELLIGENCE <b>✳</b> AUTONOMOUS AGENTS <b>✳</b> FULL-STACK ENGINEERING <b>✳</b> ALGORITHMS & CHESS <b>✳</b> CREATIVE DEVELOPMENT <b>✳</b> DATA SCIENCE <b>✳</b></span>)}</div></div>

    <CapabilityBlock/>

    <section className="crew-section" id="crew"><div className="section-wrap crew-heading"><div><p className="eyebrow"><span>02</span> THE WORKING SET</p><h2>Meet the<br/><em>lab crew.</em></h2></div><p>Not fictional employees. A cast of real projects, each with its own job to do. Open a pass to see what it is and where the source lives.</p></div>
      <div className="crew-grid section-wrap">
        {[
          {code:"KNIGHT-01",label:"Interactive systems",name:"KnightForge",text:"A place to test ideas against the board.",icon:"♞",tone:"lime",target:"knightforge"},
          {code:"SAGE-02",label:"Autonomous strategy",name:"Battlecode",text:"Agents, decisions and iteration under pressure.",icon:"⌘",tone:"blue",target:"battlecode"},
          {code:"ECHO-03",label:"Language tools",name:"Summarizer",text:"Finding the signal in long conversations.",icon:"≋",tone:"peach",target:"whatsapp"},
          {code:"VISTA-04",label:"Computer vision",name:"Drone Vision",text:"Exploring how machines interpret a view.",icon:"⌖",tone:"violet",target:"dronevision"}
        ].map((agent,i)=><button className={`crew-card crew-${agent.tone} reveal`} key={agent.code} onClick={()=>{playSound("interaction");setSelectedProject(projects.find(p=>p.id===agent.target)||null);}}><div className="crew-card-head"><span>AK LAB / {agent.code}</span><ArrowUpRight size={16}/></div><div className="crew-figure"><div className="crew-halo"/><div className="crew-avatar">{agent.icon}</div><span className="crew-orbit-dot"/></div><div className="crew-card-body"><span>{agent.label}</span><h3>{agent.name}</h3><p>{agent.text}</p></div><div className="crew-card-bottom"><span>VIEW PROJECT FILE</span><ChevronRight size={15}/></div></button>)}
      </div>
      <div className="crew-foot section-wrap"><span>THE REST OF THE WORKBENCH IS JUST BELOW</span><a href="#lab">OPEN PROJECT INDEX <ArrowDownRight size={13}/></a></div>
    </section>

    <section className="process-section section-dark" id="process"><div className="section-head section-wrap"><div><p className="eyebrow"><span>03</span> THE METHOD</p><h2>Less theatre.<br/><em>More building.</em></h2></div><p className="section-intro-copy">A simple loop for making software useful. The process adapts to the problem; the habit of testing assumptions stays.</p></div>
      <div className="process-grid section-wrap">{[
        {n:"01",name:"Find the real problem",sub:"DEFINE",text:"Get specific about the goal, constraints and what a useful outcome should look like before reaching for a tool.",symbol:"⌕",foot:"CLARITY OVER NOISE"},
        {n:"02",name:"Connect the pieces",sub:"DESIGN",text:"Choose the right abstractions, connect the components and keep the architecture understandable.",symbol:"⌘",foot:"SYSTEMS OVER PATCHES"},
        {n:"03",name:"Test what matters",sub:"ITERATE",text:"Inspect behaviour, challenge assumptions and refine the result based on evidence—not vanity metrics.",symbol:"↗",foot:"PROGRESS OVER THEATRE"}
      ].map((p,i)=><article className={`process-card reveal process-${i+1}`} key={p.n}><div className="process-card-top"><span>{p.n} <i>· {p.sub}</i></span><span className="process-symbol">{p.symbol}</span></div><h3>{p.name}</h3><p>{p.text}</p><div className="process-card-foot"><span>{p.foot}</span><ArrowUpRight size={14}/></div></article>)}</div>
      <p className="process-bottom section-wrap">THINK CLEARLY <i>✳</i> BUILD DELIBERATELY <i>✳</i> LEARN CONSTANTLY</p>
    </section>

    <section className="lab-section" id="lab"><div className="section-wrap lab-top"><div><p className="eyebrow"><span>04</span> SELECTED WORK / OPEN FILES</p><h2>Things I've<br/><em>put in motion.</em></h2></div><div className="lab-intro"><span>THE PROJECT INDEX <b>09 FILES / 05 FEATURED</b></span><p>Five stronger case-study candidates lead the workbench; the rest stay available as supporting experiments. Every card links to its source, with demos where available.</p><a href={`${github}?tab=repositories`} target="_blank" rel="noreferrer">ALL PUBLIC REPOSITORIES <ArrowUpRight size={14}/></a></div></div>
      <div className="project-grid section-wrap" ref={projectRef}>{projects.map((p,i)=><article className={`project-card project-${i+1} ${["knightforge","loreline","battlecode","newstrace","offline"].includes(p.id)?"project-featured":"project-secondary"} reveal`} key={p.id}><button className="project-open" onClick={()=>{playSound("interaction");setSelectedProject(p);}} aria-label={`Open ${p.name} project detail`}><ProjectArt project={p}/><div className="project-info"><div className="project-meta"><span>{p.category}</span><span>FILE {p.number}</span></div><h3>{p.name}<MoveUpRight size={20}/></h3><p>{p.description}</p><div className="project-stack">{p.stack.map(s=><span key={s}>{s}</span>)}</div><div className="project-bottom"><span><i/> {p.status}</span><span>OPEN FILE <ArrowUpRight size={12}/></span></div></div></button></article>)}</div>
    </section>

    <section className="numbers-section"><div className="numbers-wrap section-wrap"><div className="numbers-title"><span>( A QUICK READ )</span><h2>Small signals.<br/><em>Real work.</em></h2></div><div className="number-stat"><strong>02</strong><span>YEAR OF B.TECH</span><small>Computer Science & Data Science</small></div><div className="number-stat"><strong>05</strong><span>FEATURED BUILDS</span><small>Selected for technical depth</small></div><div className="number-stat"><strong>03</strong><span>CORE DIRECTIONS</span><small>Intelligence · Products · Experiences</small></div><div className="number-stat"><strong>01</strong><span>CHESS CLUB</span><small>President · Piper Chess Club</small></div></div></section>

    <section className="achievements-section section-dark" id="achievements"><div className="section-wrap achievements-wrap"><div className="achievements-head"><div><p className="eyebrow"><span>05</span> PROOF / SIGNALS</p><h2>Work leaves<br/><em>evidence.</em></h2></div><p>Not a trophy wall. A compact record of things that show ownership, competition, community work and the ability to ship.</p></div><div className="achievement-grid">{achievements.map((a,i)=><article className="achievement-card reveal" key={a.title}><div className="achievement-top"><span>0{i+1} · {a.eyebrow}</span><ArrowUpRight size={15}/></div><h3>{a.title}</h3><p>{a.detail}</p><span className="achievement-proof">{a.proof}</span></article>)}</div></div></section>

    <ToolkitStrip/>

    <section className="about-section" id="about"><div className="section-wrap about-grid"><div className="about-left"><p className="eyebrow"><span>05</span> THE PERSON BEHIND THE BUILDS</p><div className="about-monogram"><span>AK</span><i>✳</i><small>CS × DS<br/>JMI / INDIA</small></div><div className="about-coordinate">28°33′N<br/>77°17′E</div></div><div className="about-right"><p className="about-kicker">ENGINEER BY STUDY. BUILDER BY INSTINCT.</p><h2>Curious about<br/>what's <em>possible.</em></h2><p>I'm Areeb Khalid, a second-year B.Tech student in Computer Science and Data Science at Jamia Millia Islamia. I spend my time exploring AI, algorithms, software products and the details that make an interface feel considered.</p><p>Chess is a recurring thread in how I think: pattern recognition, patience, trade-offs and learning from every position. I also serve as President of the Piper Chess Club, where technology and community meet.</p><div className="about-facts"><div><span>STUDYING</span><b>B.Tech · CS & Data Science</b><small>Jamia Millia Islamia</small></div><div><span>LEADING</span><b>Piper Chess Club</b><small>President · student community</small></div><div><span>EXPLORING</span><b>AI × Systems × Design</b><small>Learning by building</small></div></div><ArrowLink href={github} external>EXPLORE MY GITHUB</ArrowLink></div></div></section>

    <section className="faq-section section-dark" id="faq"><div className="section-wrap faq-layout"><div className="faq-heading"><p className="eyebrow"><span>06</span> GOOD QUESTIONS</p><h2>Curiosity<br/><em>welcomed.</em></h2><p>Something not covered? Dot can help you navigate or point you to the source.</p><button onClick={()=>setAssistantOpen(true)}><MessageCircle size={14}/> ASK DOT</button></div><div className="faq-list">{faqs.map((f,i)=><article className={`faq-item ${openFaq===i?"open":""}`} key={f.q}><button onClick={()=>{playSound("interaction");setOpenFaq(openFaq===i?-1:i);}} aria-expanded={openFaq===i}><span className="faq-question"><small>0{i+1}</small><span className="faq-question-words" aria-hidden="true">{f.q.split(" ").map((word,wordIndex)=><span className="faq-word" key={`${word}-${wordIndex}`}>{word}</span>)}</span><span className="sr-only">{f.q}</span></span>{openFaq===i?<Minus size={17}/>:<Plus size={17}/>}</button>{openFaq===i&&<p>{f.a}</p>}</article>)}</div></div></section>

    <section className="contact-section" id="contact"><div className="contact-wrap section-wrap"><div className="contact-meta"><span><i/> OPEN TO INTERESTING CONVERSATIONS</span><span>END OF PAGE / START OF SOMETHING</span></div><div className="contact-main"><p className="eyebrow"><span>07</span> YOUR MOVE</p><h2>Let's make<br/><em>something matter.</em></h2><a className="contact-stamp" href="https://www.linkedin.com/in/areeb-khalid-960262379/" target="_blank" rel="noopener noreferrer" aria-label="Start something — open Areeb Khalid on LinkedIn"><span>✳</span><small>START<br/>SOMETHING</small><ArrowUpRight size={17}/></a></div><div className="contact-bottom"><p>Have an interesting problem, a project to build, or a conversation worth having? I'd like to hear about it.</p><div className="contact-links">{contactEmail?<><a href={`mailto:${contactEmail}`}><Mail size={15}/>{contactEmail}<ArrowUpRight size={13}/></a><button onClick={copyEmail}>{emailCopied?<Check size={14}/>:<Code2 size={14}/>} {emailCopied?"COPIED":"COPY EMAIL"}</button></>:<a href={github} target="_blank" rel="noreferrer"><Github size={15}/>GITHUB / AREEB-CODER<ArrowUpRight size={13}/></a>}<a href={`${github}?tab=repositories`} target="_blank" rel="noreferrer"><Code2 size={15}/>PUBLIC REPOSITORIES<ArrowUpRight size={13}/></a></div></div></div></section>

    <footer className="footer"><a href="#top" className="footer-mark">a<span>✳</span></a><span>BUILT WITH INTENT · © 2026 AREEB KHALID</span><a href="#top">BACK TO TOP ↑</a></footer>

    <div className="edge-tools"><button onClick={()=>setShowGame(true)}><span>✳</span> PLAY A MOVE</button><button onClick={handleToggleSound}>{soundOn?<Volume2 size={12}/>:<VolumeX size={12}/>} SOUND: {soundOn?"ON":"OFF"}</button></div>

    <DotPortal>
      <DotGuide
        visible
        mode={showDotGuide ? dotMode : "entry"}
        position={dotPosition}
        assistantOpen={assistantOpen}
        mood={dotMood}
        characterScale={dotCharacterScale}
        entryLeaving={entryLeaving}
        rootRef={dotGuideElementRef}
        onToggleAssistant={()=>{if(tourActiveRef.current&&!tourPausedRef.current){pauseTourForVisitor();setAssistantOpen(true);}else setAssistantOpen(v=>!v);}}
      />
      {showDotGuide && dotMode === "touring" && !tourPaused && <DotMicroPopup message={tourPopup?.message||""} position={tourPopup?.position||null} tone={tourPopup?.tone||"dark"}/>}
      {showDotGuide && tourClockVisible && <button className={`dot-tour-clock${tourPaused?" is-paused":""}`} type="button" onClick={pauseTourForVisitor} aria-label={`Dot ${tourPaused?"paused":"exploring"}. ${tourClockLabel} remaining. Press Escape to pause.`} title="Press Escape to pause Dot's exploration">
        <span className="dot-tour-clock-state"><i/>{tourPaused?"DOT / PAUSED":"DOT / EXPLORING"}</span>
        <span className="dot-tour-clock-count"><kbd>ESC</kbd><time>{tourClockLabel}</time></span>
      </button>}
      {showDotGuide && <AssistantWidget open={assistantOpen} onOpenChange={(open)=>{setAssistantOpen(open);if(!open&&!tourActiveRef.current)setDotMood("idle");}} onStartTour={startTour} soundOn={soundOn} onToggleSound={handleToggleSound} touring={touring} playSound={playSound} onMoodChange={(mood)=>{if(!tourActiveRef.current||tourPausedRef.current)setDotMood(mood);}}/>}
      {showDotGuide && tourPrompt&&<div className={`dot-overview-prompt${tourPaused?" is-tour-paused":""}`} role="dialog" aria-label="Pause Dot's overview"><div><span>DOT / PAUSED</span><b>Exit overview?</b><p>Want to take the controls, or let Dot finish exploring?</p></div><div className="dot-overview-actions"><button onClick={continueTour}>CONTINUE</button><button onClick={finishTour}>EXIT</button></div></div>}
    </DotPortal>

    {selectedProject&&<div className="project-modal-backdrop" role="presentation" onClick={()=>setSelectedProject(null)}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" onClick={e=>e.stopPropagation()}><div className="project-modal-top"><span>AK LAB / PROJECT FILE {selectedProject.number}</span><button onClick={()=>setSelectedProject(null)} aria-label="Close project"><X size={18}/></button></div><ProjectArt project={selectedProject}/><div className="project-modal-body"><span className="eyebrow">{selectedProject.eyebrow}</span><h2 id="project-modal-title">{selectedProject.name}</h2><p>{selectedProject.description}</p><p>{selectedProject.deeper}</p><div className="project-modal-proof"><div><span>THE PROBLEM</span><p>{selectedProject.problem}</p></div><div><span>WHAT TO VERIFY / EXPLORE</span><p>{selectedProject.evidence}</p></div></div><div className="project-modal-facts"><div><span>ROLE</span><b>{selectedProject.role}</b></div><div><span>STACK / AREAS</span><b>{selectedProject.stack.join(" · ")}</b></div><div><span>STATUS</span><b>{selectedProject.status}</b></div></div><div className="project-modal-links"><ArrowLink href={selectedProject.repo} external>OPEN SOURCE REPOSITORY</ArrowLink>{selectedProject.demo&&<ArrowLink href={selectedProject.demo} external>OPEN LIVE DEMO</ArrowLink>}</div></div></section></div>}
    {showGame&&<KnightGame onClose={()=>setShowGame(false)}/>}
  </main>;
}

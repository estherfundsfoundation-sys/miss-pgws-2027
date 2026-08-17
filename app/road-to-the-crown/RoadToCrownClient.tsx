"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { confidenceWalkthrough } from "./confidenceWalkthrough";
import {
  CHRIST_CENTERED_PLATFORM_IDEA_COUNT,
  christCenteredPlatformIdeas,
  platformIdeaCategories,
} from "./christCenteredPlatformIdeas";

type Milestone = {
  id: string;
  number: string;
  date: string;
  time?: string;
  owner: "YOU" | "FOUNDATION" | "EVERYONE";
  title: string;
  summary: string;
  actions: string[];
  link?: { href: string; label: string };
};

type PlatformPlan = {
  theme: string;
  points: { title: string; body: string }[];
  campaignIdeas: string[];
};

const milestones: Milestone[] = [
  {
    id: "training",
    number: "01",
    date: "AUGUST 15",
    owner: "YOU",
    title: "Queen Training begins",
    summary: "Learn the mission, meet your sisters, understand the competition, and begin building from your purpose—not pressure.",
    actions: [
      "Complete Queen Training and participate fully.",
      "Save this roadmap and join your sister support group.",
      "Write your personal why, platform theme, and three platform points.",
    ],
  },
  {
    id: "build-window",
    number: "02",
    date: "AUGUST 15–26",
    owner: "YOU",
    title: "Build your campaign",
    summary: "This is your preparation window. Work on your video, public story, platform, graphics plan, and Contestant Studio draft.",
    actions: [
      "Outline, record, and edit your campaign video.",
      "Complete your Contestant Studio biography, scripture, platform, headshot, and video information.",
      "Practice your introduction with your sisters and ask for honest feedback.",
      "Create a supporter list before campaign week begins.",
    ],
    link: { href: "#video-lab", label: "Open the Competition Video Lab" },
  },
  {
    id: "foundation-reveal",
    number: "03",
    date: "AUGUST 25–26",
    owner: "FOUNDATION",
    title: "Official contestant reveal",
    summary: "Esther Funds Foundation and Pretty Girls Who Serve will begin introducing the official contestant class with Foundation-created graphics.",
    actions: [
      "Watch the official accounts and your competition email.",
      "Do not redesign or post the mandatory announcement graphic early.",
      "Support and celebrate your sisters as their reveals appear.",
    ],
  },
  {
    id: "announcement-post",
    number: "04",
    date: "AUGUST 26",
    time: "10:00 AM ET",
    owner: "YOU",
    title: "Post your contestant announcement",
    summary: "Introduce yourself as an official Miss PGWS 2027 contestant using the Foundation-provided announcement graphic.",
    actions: [
      "Use the official graphic and approved caption.",
      "Introduce your name, university, platform, and why this journey matters to you.",
      "Tell supporters that voting opens the next day.",
      "Tag @prettygirlswhoserve and @estherfundsfoundation.",
    ],
  },
  {
    id: "video-post",
    number: "05",
    date: "AUGUST 27",
    time: "10:00 AM ET",
    owner: "YOU",
    title: "Your campaign video goes live",
    summary: "Post your official campaign Reel two hours before voting opens so supporters have time to hear your story and connect to your mission.",
    actions: [
      "Add @estherfundsfoundation and @prettygirlswhoserve as collaborators—not only tags.",
      "Use the approved caption, contestant number, and campaign hashtags.",
      "Confirm the post is public and the sound works.",
      "Paste the public Instagram post link into your Contestant Studio.",
    ],
    link: { href: "#video-lab", label: "Review video directions" },
  },
  {
    id: "voting-opens",
    number: "06",
    date: "AUGUST 27",
    time: "12:00 PM ET",
    owner: "EVERYONE",
    title: "Voting and campaign week open",
    summary: "Rally your campus, church, organizations, family, alumni, and community around the mission. Every verified vote is $2.50 through the official voting form.",
    actions: [
      "Share only the official voting link and graphic.",
      "Explain that voting donations support Esther Funds Foundation scholarship and student-support work.",
      "Post consistently, thank supporters, and keep your campaign rooted in your platform.",
      "Never collect voting money personally or promise refunds.",
    ],
    link: { href: "#campaign-week", label: "Open the Campaign Week playbook" },
  },
  {
    id: "voting-closes",
    number: "07",
    date: "SEPTEMBER 3",
    time: "11:59 PM ET",
    owner: "EVERYONE",
    title: "Voting closes",
    summary: "The final day is about clarity, gratitude, and urgency. All votes must be completed through the official form before the deadline.",
    actions: [
      "Post a morning reminder and an evening countdown.",
      "Personally follow up with supporters who asked for the link.",
      "Thank your community whether or not they were able to donate.",
      "Stop campaigning when the official deadline arrives.",
    ],
  },
  {
    id: "winners",
    number: "08",
    date: "SEPTEMBER 4",
    owner: "FOUNDATION",
    title: "Final verification and winners announced",
    summary: "The Foundation verifies eligible payments and final results before announcing the 2027 titleholders.",
    actions: [
      "Remember that the public leaderboard is provisional until verification is complete.",
      "Celebrate the sisterhood and the impact created together.",
      "Watch official PGWS and EFF channels for the winner announcement.",
    ],
  },
];

const countdownEvents = [
  { label: "your announcement post", at: "2026-08-26T10:00:00-04:00" },
  { label: "your campaign video post", at: "2026-08-27T10:00:00-04:00" },
  { label: "voting opening", at: "2026-08-27T12:00:00-04:00" },
  { label: "voting closing", at: "2026-09-03T23:59:00-04:00" },
];

const campaignDays = [
  ["AUG 27", "Launch with your why", "Post the official video, share the voting link at noon, and tell supporters what your platform means to you."],
  ["AUG 28", "Teach one platform point", "Turn one of your three platform points into a Reel, carousel, Story lesson, or honest reflection."],
  ["AUG 29", "Invite your inner circle", "Ask five people to become campaign ambassadors who will repost, text their circles, and keep momentum moving."],
  ["AUG 30", "Faith and purpose", "Share the Scripture, prayer, or truth in Christ that grounds your platform and the woman you are becoming."],
  ["AUG 31", "Campus and community day", "Reach your university, department, student organizations, alumni, church, and local community."],
  ["SEP 1", "Show the impact", "Explain how EFF scholarships and student support help women remain enrolled and keep moving toward graduation."],
  ["SEP 2", "Forty-eight-hour rally", "Use a countdown, supporter testimonials, a Live, or a team challenge. Make the next action unmistakably clear."],
  ["SEP 3", "Finish with gratitude", "Share final reminders without pressure, thank everyone publicly, and close your campaign with grace."],
];

const campaignIdeas = [
  "Ask five campus organizations to repost your official voting graphic and platform statement.",
  "Host a fifteen-minute Instagram Live with a sister contestant about faith, confidence, and your platforms.",
  "Create a ‘Why I Serve’ Story series featuring three people or experiences that shaped your mission.",
  "Invite ten friends to become a Ruby Team; each person shares your official link with five supporters.",
  "Ask your church, campus ministry, department, sorority, club, or alumni group to feature your journey.",
  "Post a campus walk-and-talk Reel explaining one platform point in your natural voice.",
  "Create a daily progress celebration that thanks supporters without sharing private donor information.",
  "Share a short letter to the young woman your platform is designed to help.",
];

const voteTiers = [
  { votes: 25, name: "Launch Circle", message: "Your first believers are helping the campaign move." },
  { votes: 50, name: "Campus Rally", message: "Your message is reaching beyond your closest circle." },
  { votes: 100, name: "Ruby Momentum", message: "One hundred acts of support can create real student impact." },
  { votes: 250, name: "Crown Impact", message: "Your community is rallying around both you and the mission." },
  { votes: 500, name: "Legacy Circle", message: "Your platform has become a movement bigger than one post." },
] as const;

const voteBundles = [
  { votes: 1, name: "One vote", amount: 2.5, note: "One supporter. One verified vote." },
  { votes: 5, name: "High Five", amount: 12.5, note: "A simple way for one supporter to give five votes." },
  { votes: 10, name: "Ruby Ten", amount: 25, note: "Ten votes purchased together in one checkout." },
  { votes: 20, name: "Support Circle", amount: 50, note: "Twenty votes toward the same contestant." },
  { votes: 50, name: "Crown Rally", amount: 125, note: "A strong group, family, church, or alumni rally." },
  { votes: 100, name: "Legacy Push", amount: 250, note: "One hundred votes in one verified transaction." },
] as const;

const voteGoalPresets = [100, 250, 500, 750, 1000] as const;

const platformFrameworks = {
  educate: ["EDUCATE", "EQUIP", "EMPOWER"],
  mentor: ["AFFIRM", "GUIDE", "CONNECT"],
  serve: ["LISTEN", "SERVE", "SUSTAIN"],
  advocate: ["UNDERSTAND", "AMPLIFY", "ACT"],
  faith: ["ROOT", "RESTORE", "REACH"],
} as const;

const platformDraftStorageKey = "miss-pgws-2027-platform-generator-draft";
const confidenceNotesStorageKey = "miss-pgws-2027-confidence-walkthrough-notes";

const exampleLinks = [
  {
    title: "Past campaign video 01",
    note: "Listen for the opening hook. What makes you want to keep watching?",
    href: "https://www.instagram.com/reel/DQ_83FtDNTU/",
  },
  {
    title: "Past campaign video 02",
    note: "Notice how the contestant organizes her story from introduction to closing.",
    href: "https://www.instagram.com/reel/DRDIayqj-Im/",
  },
  {
    title: "Past campaign video 03",
    note: "Watch the speaker's voice, eye contact, posture, pace, and presence.",
    href: "https://www.instagram.com/reel/DQ4QDmyDbJf/",
  },
  {
    title: "Past campaign video 04",
    note: "Identify the central message, platform connection, and call to action.",
    href: "https://www.instagram.com/reel/DQ4LATCjtz9/",
  },
  {
    title: "Past campaign video 05",
    note: "Discuss the visual choices, setting, styling, captions, and overall clarity.",
    href: "https://www.instagram.com/p/DZBhT5XDeP1/?img_index=2",
  },
  {
    title: "Past campaign video 06",
    note: "What inspires you here—and how will you make your own video unmistakably yours?",
    href: "https://www.instagram.com/p/DZBiwH4DTHz/?img_index=2",
  },
];

const storageKey = "miss-pgws-2027-road-to-crown";

const routeMarkers = [
  { left: "8%", top: "82%" },
  { left: "28%", top: "72%" },
  { left: "20%", top: "48%" },
  { left: "43%", top: "55%" },
  { left: "63%", top: "43%" },
  { left: "48%", top: "24%" },
  { left: "72%", top: "17%" },
  { left: "90%", top: "9%" },
] as const;

function durationParts(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export function RoadToCrownClient({ campaignQuestion }: { campaignQuestion: string }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [openMilestone, setOpenMilestone] = useState("training");
  const [now, setNow] = useState<number | null>(null);
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [voteGoal, setVoteGoal] = useState(250);
  const [currentVotes, setCurrentVotes] = useState(0);
  const [campaignDaysRemaining, setCampaignDaysRemaining] = useState(8);
  const [supporterGoal, setSupporterGoal] = useState(20);
  const [platformAudience, setPlatformAudience] = useState("");
  const [platformIssue, setPlatformIssue] = useState("");
  const [platformWhy, setPlatformWhy] = useState("");
  const [platformChange, setPlatformChange] = useState("");
  const [platformApproach, setPlatformApproach] = useState<keyof typeof platformFrameworks>("educate");
  const [platformPlan, setPlatformPlan] = useState<PlatformPlan | null>(null);
  const [platformIdeaCategory, setPlatformIdeaCategory] = useState("identity");
  const [platformIdeaSeed, setPlatformIdeaSeed] = useState(0);
  const [confidenceStep, setConfidenceStep] = useState(0);
  const [confidenceNotes, setConfidenceNotes] = useState<Record<string, string>>({});
  const [breakoutSeconds, setBreakoutSeconds] = useState(7 * 60);
  const [breakoutRunning, setBreakoutRunning] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) setCompleted(saved.filter((value) => typeof value === "string"));
    } catch {
      setCompleted([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(confidenceNotesStorageKey) || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) setConfidenceNotes(saved);
    } catch {
      setConfidenceNotes({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(confidenceNotesStorageKey, JSON.stringify(confidenceNotes));
  }, [confidenceNotes]);

  useEffect(() => {
    if (!breakoutRunning) return;
    const timer = window.setInterval(() => {
      setBreakoutSeconds((current) => {
        if (current <= 1) {
          setBreakoutRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breakoutRunning]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(completed));
  }, [completed, hydrated]);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.round((completed.length / milestones.length) * 100);
  const nextEvent = useMemo(
    () => now === null ? countdownEvents[0] : countdownEvents.find((event) => new Date(event.at).getTime() > now),
    [now],
  );
  const remaining = durationParts(nextEvent && now !== null ? new Date(nextEvent.at).getTime() - now : 0);
  const votesRemaining = Math.max(0, voteGoal - currentVotes);
  const votesPerDay = Math.ceil(votesRemaining / campaignDaysRemaining);
  const votesPerSupporter = Math.ceil(votesRemaining / supporterGoal);
  const platformIdeaPool = useMemo(
    () => christCenteredPlatformIdeas.filter((idea) => idea.categoryKey === platformIdeaCategory),
    [platformIdeaCategory],
  );
  const selectedChristIdeas = useMemo(() => {
    const count = platformIdeaPool.length;
    if (!count) return [];
    const start = (platformIdeaSeed * 3) % count;
    return [0, 1, 2].map((offset) => platformIdeaPool[(start + offset) % count]);
  }, [platformIdeaPool, platformIdeaSeed]);
  const activeConfidenceStep = confidenceWalkthrough[confidenceStep];
  const breakoutMinutes = Math.floor(breakoutSeconds / 60);
  const breakoutRemainder = String(breakoutSeconds % 60).padStart(2, "0");

  function toggleComplete(id: string) {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function openFromMap(id: string) {
    setOpenMilestone(id);
    window.setTimeout(() => document.getElementById(`milestone-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  function buildPlatformPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const audience = platformAudience.trim();
    const issue = platformIssue.trim();
    const why = platformWhy.trim();
    const change = platformChange.trim();
    if (!audience || !issue || !why || !change) return;

    const approach = platformApproach === "educate" ? "education" : platformApproach === "mentor" ? "mentorship" : platformApproach === "serve" ? "service" : platformApproach === "advocate" ? "advocacy" : "faith-building";
    const plan: PlatformPlan = {
      theme: `From ${issue} to ${change}`,
      points: selectedChristIdeas.map((idea) => ({
        title: idea.title,
        body: `${idea.statement} Make this personal through ${approach} that helps ${audience} move beyond ${issue} toward ${change}.`,
      })),
      campaignIdeas: [
        `My Why Reel — Share how “${why}” shaped your decision to serve ${audience}.`,
        `Platform Point 1 carousel — Teach your audience how ${issue} appears in real life and why it deserves attention.`,
        `Sister Conversation Live — Invite another contestant to discuss faith, identity, and what ${change} could look like.`,
        `Resource Drop — Share three practical tools, campus resources, Scriptures, or organizations that can help ${audience}.`,
        `Community Voice — Feature a mentor, student, ministry leader, or professional connected to your platform issue.`,
        `Take-Action Challenge — Give supporters one meaningful action they can complete and share within 24 hours.`,
        `Progress & Gratitude Story — Celebrate the people rallying around your message without exposing private donor information.`,
        `Final Invitation — Restate your three platform points, thank your community, and invite one final purpose-centered action.`,
      ],
    };
    setPlatformPlan(plan);
    window.setTimeout(() => document.getElementById("platform-plan-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  function sendPlatformPlanToStudio() {
    if (!platformPlan) return;
    const formatted = [
      `PLATFORM THEME: ${platformPlan.theme}`,
      "",
      ...platformPlan.points.flatMap((point, index) => [
        `PLATFORM POINT ${index + 1} — ${point.title}`,
        point.body,
        "",
      ]),
      `WHY THIS MATTERS TO ME: ${platformWhy.trim()}`,
    ].join("\n").trim();
    window.localStorage.setItem(platformDraftStorageKey, formatted);
    window.location.href = "/portal/campaign#campaign-profile";
  }

  function openConfidenceStep(index: number) {
    const next = Math.max(0, Math.min(confidenceWalkthrough.length - 1, index));
    setConfidenceStep(next);
    if (confidenceWalkthrough[next].mode !== "breakout") setBreakoutRunning(false);
    window.setTimeout(() => document.getElementById("confidence-stage")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function resetBreakoutTimer() {
    setBreakoutRunning(false);
    setBreakoutSeconds(7 * 60);
  }

  return (
    <>
      <section className="road-command" id="guided-roadmap">
        <div className="road-command__inner">
          <div className="road-progress" style={{ "--road-progress": `${progress * 3.6}deg` } as CSSProperties}>
            <div><strong>{progress}%</strong><span>roadmap checked</span></div>
          </div>
          <div className="road-command__copy">
            <p className="eyebrow">YOUR LIVE CAMPAIGN CLOCK</p>
            <h2>{nextEvent ? `Next: ${nextEvent.label}` : "The official campaign is complete."}</h2>
            {now === null ? <p className="road-clock-loading">Loading the official campaign clock…</p> : nextEvent ? <div className="road-countdown" aria-live="polite">
              <span><b>{remaining.days}</b>days</span>
              <span><b>{String(remaining.hours).padStart(2, "0")}</b>hours</span>
              <span><b>{String(remaining.minutes).padStart(2, "0")}</b>minutes</span>
              <span><b>{String(remaining.seconds).padStart(2, "0")}</b>seconds</span>
            </div> : <p>Voting is closed. Watch the official PGWS and EFF channels for the verified winner announcement on September 4.</p>}
          </div>
          <button className="road-reset" type="button" onClick={() => setCompleted([])} disabled={!completed.length}>Reset my checks</button>
        </div>
      </section>

      <section className="road-section road-section--paper">
        <div className="road-section__heading">
          <div><p className="eyebrow">THE OFFICIAL WALKTHROUGH</p><h2>Eight moments.<br />One clear road.</h2></div>
          <p>Tap each card as Ms. Vincent walks through it. Expand the directions, ask questions, and check the milestone when you understand your responsibility.</p>
        </div>
        <div className="road-route-map" id="road-map">
          <svg className="road-route-map__road" viewBox="0 0 1200 650" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="roadEdge" x1="0" x2="1">
                <stop offset="0" stopColor="#dba0b6" />
                <stop offset=".48" stopColor="#b82f52" />
                <stop offset="1" stopColor="#7e173e" />
              </linearGradient>
              <filter id="roadShadow" x="-20%" y="-30%" width="140%" height="160%">
                <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#421326" floodOpacity=".22" />
              </filter>
            </defs>
            <path className="road-route-map__edge" filter="url(#roadShadow)" d="M 50 575 C 230 575, 360 530, 315 425 C 275 330, 475 415, 600 330 C 700 260, 540 190, 710 150 C 835 120, 920 150, 1140 65" />
            <path className="road-route-map__asphalt" d="M 50 575 C 230 575, 360 530, 315 425 C 275 330, 475 415, 600 330 C 700 260, 540 190, 710 150 C 835 120, 920 150, 1140 65" />
            <path className="road-route-map__lane" d="M 50 575 C 230 575, 360 530, 315 425 C 275 330, 475 415, 600 330 C 700 260, 540 190, 710 150 C 835 120, 920 150, 1140 65" />
          </svg>
          <span className="road-route-map__start">START<br /><b>WITH PURPOSE</b></span>
          <span className="road-route-map__finish" aria-hidden="true"><i>♛</i><b>THE CROWN</b></span>
          <span className="road-route-map__spark road-route-map__spark--one" aria-hidden="true">✦</span>
          <span className="road-route-map__spark road-route-map__spark--two" aria-hidden="true">✦</span>
          <span className="road-route-map__spark road-route-map__spark--three" aria-hidden="true">✦</span>
          {milestones.map((item, index) => {
            const isComplete = completed.includes(item.id);
            return <button
              key={item.id}
              className={`road-route-marker ${isComplete ? "road-route-marker--complete" : ""}`}
              style={routeMarkers[index] as CSSProperties}
              type="button"
              onClick={() => openFromMap(item.id)}
              aria-label={`Open milestone ${item.number}: ${item.title}`}
            >
              <span><b>{isComplete ? "✓" : item.number}</b></span>
              <small>{item.date}</small>
            </button>;
          })}
        </div>
        <div className="road-timeline">
          {milestones.map((item) => {
            const isComplete = completed.includes(item.id);
            const isOpen = openMilestone === item.id;
            return <article id={`milestone-${item.id}`} className={`road-milestone ${isComplete ? "road-milestone--complete" : ""}`} key={item.id}>
              <button className="road-milestone__summary" type="button" aria-expanded={isOpen} onClick={() => setOpenMilestone(isOpen ? "" : item.id)}>
                <span className="road-milestone__number">{item.number}</span>
                <span className="road-milestone__date"><b>{item.date}</b>{item.time && <small>{item.time}</small>}</span>
                <span className={`road-owner road-owner--${item.owner.toLowerCase()}`}>{item.owner}</span>
                <span className="road-milestone__title"><strong>{item.title}</strong><small>{item.summary}</small></span>
                <span className="road-milestone__toggle" aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && <div className="road-milestone__details">
                <div><p className="eyebrow">WHAT THIS LOOKS LIKE</p><ul>{item.actions.map((action) => <li key={action}>{action}</li>)}</ul></div>
                <div className="road-milestone__action">
                  {item.link && <a className="button button--paper button--small" href={item.link.href}>{item.link.label}</a>}
                  <button className={`road-check ${isComplete ? "road-check--complete" : ""}`} type="button" aria-pressed={isComplete} onClick={() => toggleComplete(item.id)}>
                    <span aria-hidden="true">{isComplete ? "✓" : "○"}</span>{isComplete ? "I understand this step" : "Mark this step understood"}
                  </button>
                </div>
              </div>}
            </article>;
          })}
        </div>
      </section>

      <section className="road-section road-section--berry" id="video-lab">
        <div className="road-section__heading road-section__heading--light">
          <div><p className="eyebrow eyebrow--light">THE COMPETITION VIDEO LAB</p><h2>Tell the story<br />behind the crown.</h2></div>
          <p>Your strongest video will feel like you—not like a commercial. Speak clearly, answer the prompt, and let people understand who your platform is meant to serve.</p>
        </div>
        <div className="video-lab-grid">
          <article className="video-prompt-card">
            <span className="video-prompt-card__label">OFFICIAL 2027 PROMPT</span>
            <blockquote>{campaignQuestion}</blockquote>
            <p>There is no required minimum or maximum length. A focused 90 seconds to 3 minutes is a helpful recommendation, not a rule.</p>
          </article>
          <article className="video-guide-card">
            <p className="eyebrow">A SIMPLE STORY ARC</p>
            <ol>
              <li><b>Introduce her.</b><span>Your name, university, contestant number, and platform.</span></li>
              <li><b>Name the issue.</b><span>What lie or challenge has affected you or the women you want to serve?</span></li>
              <li><b>Speak the truth.</b><span>What did you learn, and what does God say instead?</span></li>
              <li><b>Show the action.</b><span>What are your three platform points and how will you create change?</span></li>
              <li><b>Invite the audience.</b><span>Give supporters one clear reason to join your journey.</span></li>
            </ol>
          </article>
          <article className="attire-card">
            <p className="eyebrow">VIDEO ATTIRE</p>
            <h3>Pink. White. Elegance.</h3>
            <p>Build your look with pink and/or white, then add pearls, rubies, or refined crown-inspired details. Keep the setting clean and let your face and voice remain easy to see and hear.</p>
            <div className="attire-swatches" aria-label="Suggested video colors"><span className="swatch-pink" /><span className="swatch-white" /><span className="swatch-pearl" /><span className="swatch-ruby" /></div>
            <small>You are not scored on clothing cost, makeup, professional equipment, or editing budget.</small>
          </article>
          <article className="recording-card">
            <p className="eyebrow">BEFORE YOU POST</p>
            <ul>
              <li>Record vertically for an Instagram Reel.</li>
              <li>Face a window or soft light; avoid a bright window behind you.</li>
              <li>Choose a quiet room and test every word with headphones.</li>
              <li>Add captions so your message is accessible without sound.</li>
              <li>Confirm your final post is public and can be shared.</li>
              <li>Add both organizations as collaborators before publishing.</li>
            </ul>
          </article>
        </div>
        <div className="video-scholarship-callout">
          <div className="video-scholarship-callout__seal" aria-hidden="true">♛</div>
          <div>
            <p className="eyebrow eyebrow--light">SPECIAL SCHOLARSHIP OPPORTUNITY</p>
            <h3>Best Campaign Video Micro-Scholarship</h3>
            <p>The strongest eligible campaign video will earn special recognition and a micro-scholarship. Give this assignment your very best: answer the official prompt, speak in your real voice, connect the story to your platform, and create something only you could create.</p>
          </div>
          <div className="video-scholarship-callout__focus"><span>Authenticity</span><span>Prompt clarity</span><span>Platform connection</span><span>Confident delivery</span><span>Creative storytelling</span><span>Competition compliance</span></div>
        </div>
        <div className="past-examples">
          <div><p className="eyebrow eyebrow--light">PAST PAGEANT EXAMPLES</p><h3>Use these for inspiration—not imitation.</h3></div>
          <div className="past-examples__grid">{exampleLinks.map((example) => <a key={example.title} href={example.href} target="_blank" rel="noreferrer"><strong>{example.title}</strong><span>{example.note}</span><b>Open example ↗</b></a>)}</div>
        </div>
      </section>

      <section className="road-section confidence-experience" id="confidence-walkthrough">
        <div className="road-section__heading road-section__heading--light">
          <div><p className="eyebrow eyebrow--light">CONFIDENCE & PLATFORM EXPERIENCE</p><h2>Rooted before<br />she is crowned.</h2></div>
          <p>This guided website experience replaces the confidence slides. Ms. Vincent can move through each mini-lesson, pause for private reflection, invite chat engagement, and still send contestants into Zoom breakout rooms for live practice.</p>
        </div>

        <nav className="confidence-step-nav" aria-label="Confidence walkthrough steps">{confidenceWalkthrough.map((step, index) => <button key={step.number} className={confidenceStep === index ? "confidence-step-nav__active" : ""} type="button" onClick={() => openConfidenceStep(index)} aria-current={confidenceStep === index ? "step" : undefined}><span>{step.number}</span><b>{step.label}</b></button>)}</nav>

        <div className={`confidence-stage confidence-stage--${activeConfidenceStep.mode}`} id="confidence-stage">
          <div className="confidence-stage__chapter">
            <span>{activeConfidenceStep.number}</span>
            <p>{activeConfidenceStep.label}</p>
            <small>{activeConfidenceStep.mode === "breakout" ? "LIVE SISTER PRACTICE" : activeConfidenceStep.mode === "reflect" ? "PRIVATE MIRROR MOMENT" : activeConfidenceStep.mode === "share" ? "RETURN & AFFIRM" : "GUIDED MINI-LESSON"}</small>
          </div>
          <div className="confidence-stage__lesson">
            <p className="eyebrow">CONFIDENCE & PLATFORM LAB</p>
            <h3>{activeConfidenceStep.title}</h3>
            <p className="confidence-stage__subtitle">{activeConfidenceStep.subtitle}</p>
            <div className="confidence-teaching-list">{activeConfidenceStep.teaching.map((item, index) => <div key={item}><span>0{index + 1}</span><p>{item}</p></div>)}</div>
            {activeConfidenceStep.callout && <blockquote>{activeConfidenceStep.callout}</blockquote>}
          </div>
          <div className="confidence-stage__activity">
            <div className="facilitator-cue"><span>MS. VINCENT’S CUE</span><p>{activeConfidenceStep.facilitatorCue}</p></div>
            {activeConfidenceStep.prompt && <label className="confidence-private-note"><span>MY PRIVATE NOTE</span><textarea rows={5} value={confidenceNotes[activeConfidenceStep.number] || ""} onChange={(event) => setConfidenceNotes((current) => ({ ...current, [activeConfidenceStep.number]: event.target.value }))} placeholder={activeConfidenceStep.prompt} /><small>Saved only on this device. Share only what feels safe.</small></label>}
            {activeConfidenceStep.mode === "breakout" && <div className="breakout-control-room">
              <div><p className="eyebrow eyebrow--light">ZOOM BREAKOUT TIMER</p><strong>{breakoutMinutes}:{breakoutRemainder}</strong><span>{breakoutSeconds === 0 ? "Welcome the queens back." : breakoutRunning ? "Breakout rooms are practicing." : "Ready for pairs or groups of three."}</span></div>
              <div><button className="button button--paper" type="button" disabled={breakoutSeconds === 0} onClick={() => setBreakoutRunning((current) => !current)}>{breakoutRunning ? "Pause timer" : "Start 7-minute timer"}</button><button className="button button--ghost" type="button" onClick={resetBreakoutTimer}>Reset</button></div>
              <p><b>Round 1:</b> introduction with notes and sister feedback. <b>Round 2:</b> repeat with fewer notes and more natural connection. Broadcast a two-minute warning before closing the rooms.</p>
            </div>}
            <div className="confidence-stage__actions"><button className="button button--paper" type="button" disabled={confidenceStep === 0} onClick={() => openConfidenceStep(confidenceStep - 1)}>Previous</button><span>STEP {confidenceStep + 1} OF {confidenceWalkthrough.length}</span><button className="button button--lipstick" type="button" disabled={confidenceStep === confidenceWalkthrough.length - 1} onClick={() => openConfidenceStep(confidenceStep + 1)}>Next experience</button></div>
          </div>
        </div>
      </section>

      <section className="road-section road-section--studio" id="contestant-studio">
        <div className="road-section__heading">
          <div><p className="eyebrow">CONTESTANT STUDIO WALKTHROUGH</p><h2>Your public<br />cover story.</h2></div>
          <p>The Studio is where the public meets you. Build privately, watch your readiness checks turn green, then publish when your profile is complete and approved.</p>
        </div>
        <div className="studio-walkthrough">
          {[
            ["01", "Sign in", "Use the same email connected to your accepted application. No second account is needed."],
            ["02", "Open Contestant Studio", "From your portal, choose Contestant Studio to open your private campaign workspace."],
            ["03", "Build your profile", "Complete your public name, biography, platform, scripture, headshot, campaign video, and Instagram link."],
            ["04", "Save a private draft", "Save as often as needed. Your unfinished edits do not have to be public."],
            ["05", "Reach 100% ready", "Use the checkmark list to find any missing item and test every public link."],
            ["06", "Publish and review", "Publish your complete profile, then open the public contestant gallery and review it like a supporter."],
          ].map(([number, title, body]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}
        </div>
        <div className="studio-actions"><a className="button button--lipstick" href="/portal/campaign">Open my Contestant Studio</a><a className="button button--paper" href="#platform-lab">Build my platform points</a><a className="button button--paper" href="/contestants">Preview the public contestant gallery</a></div>
      </section>

      <section className="road-section platform-lab" id="platform-lab">
        <div className="road-section__heading road-section__heading--light">
          <div><p className="eyebrow eyebrow--light">THE PLATFORM POINTS GENERATOR</p><h2>Turn your why<br />into a platform.</h2></div>
          <p>Answer four honest questions. The generator will shape your answers into a theme, three connected platform points, and eight campaign-week ideas. Use the result as a starting place, then rewrite it in your own voice.</p>
        </div>

        <div className="platform-builder-shell">
          <form className="platform-builder-form" onSubmit={buildPlatformPlan}>
            <div className="platform-builder-intro"><span>01</span><div><p className="eyebrow">YOUR CALLING</p><h3>Tell the truth before you choose the words.</h3></div></div>
            <label><span>Who do you feel called to serve?</span><input required value={platformAudience} onChange={(event) => setPlatformAudience(event.target.value)} placeholder="Example: first-generation college women" /></label>
            <label><span>What issue or challenge are they facing?</span><input required value={platformIssue} onChange={(event) => setPlatformIssue(event.target.value)} placeholder="Example: feeling invisible and unworthy" /></label>
            <label><span>Why is this personal to you?</span><textarea required rows={4} value={platformWhy} onChange={(event) => setPlatformWhy(event.target.value)} placeholder="Name the experience, person, prayer, or moment that made you care." /></label>
            <label><span>What change do you want to help create?</span><textarea required rows={3} value={platformChange} onChange={(event) => setPlatformChange(event.target.value)} placeholder="Example: confidence rooted in Christ and the courage to remain in college" /></label>
            <label><span>Which Christ-centered focus best fits your calling?</span><select value={platformIdeaCategory} onChange={(event) => { setPlatformIdeaCategory(event.target.value); setPlatformIdeaSeed(0); }}>{platformIdeaCategories.map((category) => <option key={category.key} value={category.key}>{category.category} · {category.scripture}</option>)}</select></label>
            <label><span>How do you most naturally want to lead?</span><select value={platformApproach} onChange={(event) => setPlatformApproach(event.target.value as keyof typeof platformFrameworks)}><option value="educate">Educate and raise awareness</option><option value="mentor">Mentor and build confidence</option><option value="serve">Serve and provide resources</option><option value="advocate">Advocate and create change</option><option value="faith">Build faith and community</option></select></label>
            <button className="button button--lipstick" type="submit">Generate my platform points</button>
            <small>Your answers stay on this device unless you choose to send the completed draft to your Contestant Studio.</small>
          </form>

          <div className={`platform-builder-results ${platformPlan ? "platform-builder-results--ready" : ""}`} id="platform-plan-results" aria-live="polite">
            {!platformPlan ? <div className="platform-builder-placeholder"><span aria-hidden="true">✦</span><p className="eyebrow eyebrow--light">YOUR PLATFORM COVER STORY</p><h3>Your three points will appear here.</h3><p>Strong platform points work together: one helps people understand, one gives them tools, and one invites them to act.</p></div> : <>
              <div className="platform-theme-card"><p className="eyebrow eyebrow--light">YOUR WORKING PLATFORM THEME</p><h3>{platformPlan.theme}</h3><small>Read it aloud. Keep the meaning, then make the wording sound like you.</small></div>
              <div className="generated-platform-points">{platformPlan.points.map((point, index) => <article key={point.title}><span>0{index + 1}</span><div><b>{point.title}</b><p>{point.body}</p></div></article>)}</div>
              <div className="platform-results-actions"><button className="button button--paper" type="button" onClick={sendPlatformPlanToStudio}>Send this plan to my Studio</button><button className="button button--ghost" type="button" onClick={() => setPlatformPlan(null)}>Start again</button></div>
            </>}
          </div>
        </div>

        <div className="christ-platform-bank">
          <div className="christ-platform-bank__heading"><div><p className="eyebrow eyebrow--light">THE 140-POINT CHRIST-CENTERED IDEA BANK</p><h3>Fourteen callings.<br />One hundred forty ways to serve.</h3></div><div><strong>{CHRIST_CENTERED_PLATFORM_IDEA_COUNT}</strong><span>distinct platform-point starters</span></div></div>
          <div className="christ-platform-bank__controls"><label><span>Choose a focus</span><select value={platformIdeaCategory} onChange={(event) => { setPlatformIdeaCategory(event.target.value); setPlatformIdeaSeed(0); }}>{platformIdeaCategories.map((category) => <option key={category.key} value={category.key}>{category.category} · {category.scripture}</option>)}</select></label><button className="button button--paper" type="button" onClick={() => setPlatformIdeaSeed((current) => current + 1)}>Generate three different points</button></div>
          <div className="christ-platform-ideas" aria-live="polite">{selectedChristIdeas.map((idea) => <article key={`${idea.id}-${platformIdeaSeed}`}><span>IDEA {String(idea.id).padStart(3, "0")}</span><small>{idea.category} · {idea.scripture}</small><h4>{idea.title}</h4><p>{idea.statement}</p></article>)}</div>
          <p className="christ-platform-bank__note">These are Christ-centered starting points—not scripts. Contestants should connect the idea to their lived experience, name the community they will serve, and rewrite the language in their own voice.</p>
        </div>

        {platformPlan && <div className="personalized-campaign-plan">
          <div><p className="eyebrow eyebrow--light">YOUR PERSONALIZED CAMPAIGN-WEEK IDEAS</p><h3>Eight ways to make the platform visible.</h3><p>Choose the ideas that sound like you. You do not need expensive production—clarity, consistency, and honest connection matter more.</p></div>
          <div className="personalized-campaign-grid">{platformPlan.campaignIdeas.map((idea, index) => <article key={idea}><span>DAY {index + 1}</span><p>{idea}</p></article>)}</div>
        </div>}
      </section>

      <section className="road-section road-section--paper" id="campaign-week">
        <div className="road-section__heading">
          <div><p className="eyebrow">CAMPAIGN WEEK PLAYBOOK</p><h2>Do not just ask.<br />Create connection.</h2></div>
          <p>People support a mission they understand. Let every day show another part of your story, platform, faith, service, and community—not the same voting graphic eight times.</p>
        </div>
        <div className="campaign-week-grid">{campaignDays.map(([date, title, body]) => <article key={date}><span>{date}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="campaign-idea-machine">
          <div><p className="eyebrow">NEED YOUR NEXT MOVE?</p><h3>Campaign idea generator</h3><p>Use the idea as written or make it personal to your platform and community.</p></div>
          <div className="campaign-idea-machine__result"><span aria-hidden="true">✦</span><p>{campaignIdeas[ideaIndex]}</p><button type="button" className="button button--ink button--small" onClick={() => setIdeaIndex((current) => (current + 1) % campaignIdeas.length)}>Give me another idea</button></div>
        </div>
        <div className="campaign-integrity">
          <p className="eyebrow">CAMPAIGN WITH INTEGRITY</p>
          <div><span>✓ Use the official link</span><span>✓ Explain the mission</span><span>✓ Thank every supporter</span><span>✓ Protect donor privacy</span><span>✓ Build sisters up</span><span>✓ Stop at the deadline</span></div>
        </div>
      </section>

      <section className="road-section vote-rally-room" id="vote-rally-room">
        <div className="road-section__heading road-section__heading--light">
          <div><p className="eyebrow eyebrow--light">THE VOTE RALLY ROOM</p><h2>Give every vote<br />a clear goal.</h2></div>
          <p>Build your plan around votes—not a dollar amount. Every completed $2.50 voting donation equals one vote after payment verification. Your job is to tell your story, invite support with integrity, and track the votes still needed to reach your personal goal.</p>
        </div>

        <div className="vote-fact-strip">
          <article><strong>1 = $2.50</strong><span>one paid quantity becomes one vote</span></article>
          <article><strong>85%</strong><span>verified votes in the final score</span></article>
          <article><strong>15%</strong><span>performance in the final score</span></article>
          <article><strong>FINAL AUDIT</strong><span>certifies eligible votes and results</span></article>
        </div>

        <div className="vote-clarity-grid">
          <article><span>01</span><div><h3>Choose the contestant.</h3><p>The donor opens the official ballot and confirms the correct contestant name and number before paying.</p></div></article>
          <article><span>02</span><div><h3>Choose the vote quantity.</h3><p>One vote is $2.50. A quantity of 10 means 10 votes and a $25 voting donation. Bundles are quantity examples, not discounted votes.</p></div></article>
          <article><span>03</span><div><h3>Complete one secure checkout.</h3><p>The donor enters a working email address so the payment processor can send the receipt and confirmation details.</p></div></article>
          <article><span>04</span><div><h3>Wait for verification.</h3><p>Eligible completed payments are added to the provisional total. Failed, refunded, disputed, duplicate, fraudulent, voided, or late payments do not count.</p></div></article>
        </div>

        <div className="vote-goal-lab">
          <div className="vote-goal-lab__controls">
            <p className="eyebrow">BUILD YOUR PERSONAL VOTE PLAN</p>
            <h3>Set a vote goal. Then turn it into a daily plan.</h3>
            <label>
              <span><b>Vote goal</b><output>{voteGoal.toLocaleString()} votes</output></span>
              <input aria-label="Personal vote goal" type="range" min="25" max="1500" step="25" value={voteGoal} onChange={(event) => {
                const goal = Number(event.target.value);
                setVoteGoal(goal);
                setCurrentVotes((current) => Math.min(current, goal));
              }} />
            </label>
            <label>
              <span><b>Votes already earned</b><output>{currentVotes.toLocaleString()} votes</output></span>
              <input aria-label="Votes already earned" type="range" min="0" max={voteGoal} step="1" value={currentVotes} onChange={(event) => setCurrentVotes(Number(event.target.value))} />
            </label>
            <label>
              <span><b>Campaign days remaining</b><output>{campaignDaysRemaining} days</output></span>
              <input aria-label="Campaign days remaining" type="range" min="1" max="8" step="1" value={campaignDaysRemaining} onChange={(event) => setCampaignDaysRemaining(Number(event.target.value))} />
            </label>
            <label>
              <span><b>Support team</b><output>{supporterGoal} people</output></span>
              <input aria-label="Support team size" type="range" min="5" max="100" step="5" value={supporterGoal} onChange={(event) => setSupporterGoal(Number(event.target.value))} />
            </label>
            <div className="vote-goal-presets">
              {voteGoalPresets.map((votes) => <button key={votes} type="button" onClick={() => {
                setVoteGoal(votes);
                setCurrentVotes((current) => Math.min(current, votes));
              }}>{votes.toLocaleString()}-vote goal</button>)}
            </div>
          </div>
          <div className="vote-goal-lab__result" aria-live="polite">
            <span>VOTES STILL NEEDED</span>
            <strong>{votesRemaining.toLocaleString()}</strong>
            <p>to reach your personal goal of {voteGoal.toLocaleString()} verified votes</p>
            <div><b>{votesPerDay}</b><span>votes per day for the next {campaignDaysRemaining} {campaignDaysRemaining === 1 ? "day" : "days"}</span></div>
            <div><b>{votesPerSupporter}</b><span>votes per person if your {supporterGoal}-person support team shares the goal</span></div>
            <small>Your goal is motivational and personal. It is not an official placement tier, score promise, or guarantee of winning.</small>
          </div>
        </div>

        <div className="vote-bundle-section">
          <div className="vote-tier-heading">
            <div><p className="eyebrow eyebrow--light">VOTE BUNDLES EXPLAINED</p><h3>Quantity made simple.</h3></div>
            <p>A bundle is simply several $2.50 votes for the same contestant in one checkout. There is no discount and no special scoring bonus—the selected quantity is the number of eligible votes.</p>
          </div>
          <div className="vote-bundles">
            {voteBundles.map((bundle) => <article key={bundle.votes}>
              <span>{bundle.name}</span>
              <strong>{bundle.votes} {bundle.votes === 1 ? "VOTE" : "VOTES"}</strong>
              <b>${bundle.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
              <p>{bundle.note}</p>
            </article>)}
          </div>
          <div className="vote-bundle-note"><b>Example:</b> If one donor chooses 20 votes and another chooses 5 votes for you, your campaign receives 25 eligible votes after both payments are verified.</div>
          <div className="vote-bundle-actions"><a className="button button--lipstick" href="/vote">Open the official ballot</a><a className="button button--paper" href="/leaderboard">View verified vote totals</a></div>
        </div>

        <div className="vote-tier-heading">
          <div><p className="eyebrow eyebrow--light">MOMENTUM MILESTONES</p><h3>Celebrate the climb.</h3></div>
          <p>These are motivational campaign goals—not official competition rankings, score levels, or guarantees of placement.</p>
        </div>
        <div className="vote-tiers">
          {voteTiers.map((tier, index) => <article key={tier.votes}>
            <span>0{index + 1}</span>
            <b>{tier.votes} VOTES</b>
            <h3>{tier.name}</h3>
            <strong>{Math.ceil(tier.votes / 8)} votes/day</strong>
            <p>{tier.message}</p>
          </article>)}
        </div>

        <div className="community-rally-grid">
          <article className="community-rally-card">
            <p className="eyebrow">BUILD YOUR SUPPORT GROUP NOW</p>
            <h3>Do not wait for voting day to introduce the mission.</h3>
            <ol>
              <li><b>Choose your Core Five.</b><span>Five dependable people who will repost, text, encourage, and keep you accountable.</span></li>
              <li><b>Write your first 25 names.</b><span>Family, friends, classmates, faculty, church members, alumni, coworkers, and mentors.</span></li>
              <li><b>List five communities.</b><span>Your university, department, organizations, church, hometown, sorority, team, or workplace.</span></li>
              <li><b>Give everyone one clear job.</b><span>Share, donate, introduce you to a group, host a Live, or become a campaign ambassador.</span></li>
              <li><b>Practice the why.</b><span>Every supporter should be able to explain what your platform and the fundraiser support.</span></li>
            </ol>
          </article>
          <article className="sister-power-card">
            <p className="eyebrow eyebrow--light">SISTER POWER</p>
            <h3>You are competing beside one another—not against one another.</h3>
            <p>Lean on your Queen Training group. Share video ideas, practice introductions, help a sister clarify her platform, celebrate strong posts, and remind one another of deadlines. No one should feel like she has to build alone.</p>
            <div><span>Swap honest feedback</span><span>Plan a joint Live</span><span>Share filming tips</span><span>Pray for one another</span><span>Celebrate every win</span><span>Ask Ms. Vincent for guidance</span></div>
            <blockquote>“Your sister’s light does not dim yours. Help her shine.”</blockquote>
          </article>
        </div>

        <div className="donor-relationship-section">
          <div className="vote-tier-heading">
            <div><p className="eyebrow eyebrow--light">DONOR RELATIONSHIPS</p><h3>Honor the person behind every vote.</h3></div>
            <p>A donor is more than a number on the leaderboard. Build trust before the gift, protect their information during checkout, and continue the relationship with sincere gratitude afterward.</p>
          </div>
          <div className="donor-relationship-grid">
            <article><span>BEFORE</span><h3>Invite with purpose.</h3><ul><li>Tell them who you are and what your platform means.</li><li>Explain what their voting donation supports.</li><li>Share only the official ballot link.</li><li>Never pressure, shame, or promise an outcome.</li></ul></article>
            <article><span>DURING</span><h3>Protect the donor.</h3><ul><li>Let the donor complete the secure checkout personally.</li><li>Never collect card information or voting money yourself.</li><li>Confirm the contestant name and vote quantity before payment.</li><li>Keep donor names, emails, amounts, and receipts private.</li></ul></article>
            <article><span>AFTER</span><h3>Lead with gratitude.</h3><ul><li>Send a personal thank-you as soon as possible.</li><li>Do not publicly share a donor or amount without permission.</li><li>Update supporters on your platform and the impact created.</li><li>Stay connected after campaign week ends.</li></ul></article>
          </div>
        </div>

        <div className="vote-support-desk">
          <div className="vote-support-desk__copy">
            <p className="eyebrow">RECEIPTS & VOTE CONFIRMATION</p>
            <h3>Every donor should keep the receipt.</h3>
            <p>A receipt is sent to the email address entered during checkout. Donors should check Spam and Promotions and keep the receipt or transaction number. Esther Funds Foundation is a federally recognized 501(c)(3), and voting donations are tax-deductible to the extent allowed by law. Donors should retain the receipt for their records.</p>
            <p>If a donor needs help confirming whether a vote was received, email <a href="mailto:nationals@estherfundsinc.org">nationals@estherfundsinc.org</a>. The Foundation will review the payment record and respond as promptly as possible.</p>
            <a className="button button--lipstick" href="mailto:nationals@estherfundsinc.org?subject=Miss%20PGWS%202027%20vote%20confirmation%20request&amp;body=Donor%20name%3A%0AEmail%20used%20at%20checkout%3A%0AContestant%20name%20and%20number%3A%0ADate%20and%20approximate%20time%3A%0AVote%20quantity%20and%20amount%3A%0AReceipt%20or%20transaction%20number%3A%0A%0APlease%20do%20not%20include%20a%20full%20card%20number.">Email the Vote Support Desk</a>
          </div>
          <div className="vote-support-desk__checklist">
            <p className="eyebrow">INCLUDE THESE DETAILS</p>
            <span><b>01</b> Donor name</span>
            <span><b>02</b> Email used at checkout</span>
            <span><b>03</b> Contestant name and number</span>
            <span><b>04</b> Date, approximate time, and vote quantity</span>
            <span><b>05</b> Receipt or transaction number</span>
            <small>For security, never email a full card number, bank details, password, or an unredacted image showing sensitive payment information.</small>
          </div>
        </div>

        <div className="leaderboard-guidance">
          <div>
            <p className="eyebrow">THE LIVE LEADERBOARD</p>
            <h3>Use it as information—not identity.</h3>
            <p>The leaderboard updates throughout the competition, but displayed rankings remain provisional until the Foundation verifies eligible payments and final results. Check it to understand momentum, then return to your plan. A temporary position is not a verdict on your worth, platform, or ability to finish well.</p>
          </div>
          <div className="leaderboard-guidance__rules">
            <span><b>01</b> Check with purpose, not panic.</span>
            <span><b>02</b> Rally your own community; never tear down a sister.</span>
            <span><b>03</b> Keep creating even when the numbers move.</span>
            <span><b>04</b> Trust only verified final results.</span>
          </div>
          <div className="leaderboard-guidance__actions">
            <a className="button button--lipstick" href="/leaderboard">View the live leaderboard</a>
            <a className="button button--paper" href="/portal">Open my scoring portal</a>
            <small>Your official score details and released feedback appear in your contestant portal. Ms. Vincent will remain available for support and guidance throughout the experience.</small>
          </div>
        </div>
      </section>

      <section className="queen-experience-section" id="queen-experience">
        <div className="queen-experience-header">
          <p className="eyebrow">THE CROWN IS ONLY THE BEGINNING</p>
          <h2>What she wins.<br /><em>What every sister carries.</em></h2>
          <p>One woman will receive the national title—but every contestant who completes this experience leaves with recognition, documentation, a stronger platform, and a national sisterhood built around faith and service.</p>
        </div>

        <div className="queen-prize-feature">
          <div className="queen-prize-portrait">
            <img src="/queens/queens-pink-coronation.jpeg" alt="Pretty Girls Who Serve queens celebrating together at coronation" />
            <div><span>MISS PRETTY GIRLS WHO SERVE 2027</span><strong>National Titleholder</strong></div>
          </div>
          <div className="queen-prize-copy">
            <div className="queen-prize-crown" aria-hidden="true">♛</div>
            <p className="eyebrow eyebrow--light">THE NATIONAL WINNER EXPERIENCE</p>
            <h3>Crowned to represent. Chosen to serve.</h3>
            <p>Miss Pretty Girls Who Serve becomes a national ambassador for Pretty Girls Who Serve and Esther Funds Foundation—representing a growing national organization committed to faith, sisterhood, service, scholarships, and helping college women persist.</p>
            <div className="queen-prize-list">
              <article><span>01</span><div><b>Official Crown, Sash & National Title</b><p>The visible symbols of a year devoted to purpose, leadership, ministry, and service.</p></div></article>
              <article><span>02</span><div><b>$1,000–$2,500 First-Place Scholarship</b><p>10% of verified gross voting donations before processing fees, with a guaranteed $1,000 minimum and $2,500 maximum after the final audit.</p></div></article>
              <article><span>03</span><div><b>National Representation</b><p>Opportunities to represent PGWS and Esther Funds Foundation through approved events, campaigns, service initiatives, digital features, and leadership moments.</p></div></article>
              <article><span>04</span><div><b>Titleholder Photoshoot Support</b><p>A photoshoot stipend or approved photography support for her official titleholder images, with the final amount and arrangements confirmed in the written winner package.</p></div></article>
              <article><span>05</span><div><b>A Foundation-Sponsored Brunch in Her Honor</b><p>One approved PGWS brunch celebrating her reign, sisterhood, and platform. The Foundation will sponsor approved event expenses within the official written budget; she will not be required to personally finance them.</p></div></article>
              <article><span>06</span><div><b>A Year to Lead Her Platform</b><p>Support to activate an approved service initiative, share her message nationally, encourage the next contestant class, and build a legacy beyond crowning day.</p></div></article>
            </div>
          </div>
        </div>

        <div className="every-contestant-feature">
          <div className="every-contestant-feature__intro"><span aria-hidden="true">✦</span><div><p className="eyebrow">EVERY CONTESTANT RECEIVES</p><h3>No sister leaves empty-handed.</h3><p>Your crown may look different, but your work will be seen, documented, and celebrated.</p></div></div>
          <div className="every-contestant-grid">
            <article><b>Participation Certificate</b><p>Official recognition for completing the Miss PGWS 2027 Queen Training and competition experience.</p></article>
            <article><b>Personalized Recommendation Letter</b><p>A letter recognizing her participation, leadership, professionalism, service, and platform development.</p></article>
            <article><b>Verified Service-Hour Letter</b><p>Official documentation of approved service hours completed and verified through the competition.</p></article>
            <article><b>Fundraising Impact Letter</b><p>A record of her verified campaign impact and the amount her community helped raise in support of the Foundation’s mission.</p></article>
            <article><b>National Contestant Recognition</b><p>An official contestant identity, public profile, campaign feature, and place within the 2027 national contestant class.</p></article>
            <article><b>A Sisterhood & Platform to Keep</b><p>New sisters in Christ, greater confidence, campaign experience, and a purpose-centered platform she can continue beyond the pageant.</p></article>
          </div>
        </div>

        <p className="queen-package-note">All awards, titleholder opportunities, support, and event expenses remain subject to final eligibility, audit, acceptance of winner obligations, approved schedules, and written competition terms.</p>
      </section>

      <section className="road-final-cta">
        <p className="eyebrow eyebrow--light">BEAUTY. REDEFINED. CHOSEN. CROWNED.</p>
        <h2>You know what happens next.<br /><em>Now walk it with purpose.</em></h2>
        <p>Your voice, service, faith, and story are part of something larger than a competition. Build boldly, campaign honestly, and leave every sister stronger.</p>
        <a className="button button--paper" href="#guided-roadmap">Return to my roadmap</a>
      </section>
    </>
  );
}

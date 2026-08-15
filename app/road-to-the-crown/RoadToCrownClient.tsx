"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

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
  { votes: 25, name: "Launch Circle", amount: 62.5, message: "Your first believers are helping the campaign move." },
  { votes: 50, name: "Campus Rally", amount: 125, message: "Your message is reaching beyond your closest circle." },
  { votes: 100, name: "Ruby Momentum", amount: 250, message: "One hundred acts of support can create real student impact." },
  { votes: 250, name: "Crown Impact", amount: 625, message: "Your community is rallying around both you and the mission." },
  { votes: 500, name: "Legacy Circle", amount: 1250, message: "Your platform has become a movement bigger than one post." },
] as const;

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
  const [voteGoal, setVoteGoal] = useState(100);
  const [supporterGoal, setSupporterGoal] = useState(20);

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

  function toggleComplete(id: string) {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function openFromMap(id: string) {
    setOpenMilestone(id);
    window.setTimeout(() => document.getElementById(`milestone-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
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
        <div className="studio-actions"><a className="button button--lipstick" href="/portal/campaign">Open my Contestant Studio</a><a className="button button--paper" href="/contestants">Preview the public contestant gallery</a></div>
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
          <div><p className="eyebrow eyebrow--light">THE VOTE RALLY ROOM</p><h2>Turn support<br />into impact.</h2></div>
          <p>Every verified vote is a $2.50 donation through the official ballot. Your job is not to pressure people—it is to help your community understand your platform, the scholarship mission, and the impact they can create with you.</p>
        </div>

        <div className="vote-fact-strip">
          <article><strong>$2.50</strong><span>per verified vote</span></article>
          <article><strong>LIVE</strong><span>provisional leaderboard</span></article>
          <article><strong>100%</strong><span>purpose-driven campaigning</span></article>
          <article><strong>ONE</strong><span>sisterhood building together</span></article>
        </div>

        <div className="vote-goal-lab">
          <div className="vote-goal-lab__controls">
            <p className="eyebrow">BUILD YOUR PERSONAL RALLY PLAN</p>
            <h3>A goal becomes possible when you can see the people inside it.</h3>
            <label>
              <span><b>Vote goal</b><output>{voteGoal.toLocaleString()} votes</output></span>
              <input type="range" min="25" max="1000" step="25" value={voteGoal} onChange={(event) => setVoteGoal(Number(event.target.value))} />
            </label>
            <label>
              <span><b>Support team size</b><output>{supporterGoal} people</output></span>
              <input type="range" min="5" max="100" step="5" value={supporterGoal} onChange={(event) => setSupporterGoal(Number(event.target.value))} />
            </label>
            <div className="vote-goal-presets">
              {voteTiers.map((tier) => <button key={tier.votes} type="button" onClick={() => setVoteGoal(tier.votes)}>{tier.votes} votes</button>)}
            </div>
          </div>
          <div className="vote-goal-lab__result" aria-live="polite">
            <span>YOUR RALLY PLAN</span>
            <strong>${(voteGoal * 2.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <p>in potential scholarship and student-support fundraising</p>
            <div><b>{Math.ceil(voteGoal / supporterGoal)}</b><span>average votes per support-team member to reach {voteGoal.toLocaleString()}</span></div>
            <small>This is a planning tool, not a prediction or an official placement level.</small>
          </div>
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
            <strong>${tier.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
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

      <section className="road-final-cta">
        <p className="eyebrow eyebrow--light">BEAUTY. REDEFINED. CHOSEN. CROWNED.</p>
        <h2>You know what happens next.<br /><em>Now walk it with purpose.</em></h2>
        <p>Your voice, service, faith, and story are part of something larger than a competition. Build boldly, campaign honestly, and leave every sister stronger.</p>
        <a className="button button--paper" href="#guided-roadmap">Return to my roadmap</a>
      </section>
    </>
  );
}

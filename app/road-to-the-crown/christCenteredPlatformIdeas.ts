export type ChristCenteredPlatformIdea = {
  id: number;
  category: string;
  categoryKey: string;
  scripture: string;
  title: string;
  statement: string;
};

type PlatformFocus = {
  key: string;
  category: string;
  shortName: string;
  scripture: string;
  audience: string;
  struggle: string;
  truth: string;
  outcome: string;
};

const focuses: PlatformFocus[] = [
  { key: "identity", category: "Identity in Christ", shortName: "Identity", scripture: "Psalm 139:14", audience: "girls and college women", struggle: "appearance-based worth, comparison, and the pressure to perform", truth: "receive their worth as God-given instead of approval-based", outcome: "live as women who know they are seen, known, and loved by Christ" },
  { key: "confidence", category: "Confidence & Courage", shortName: "Courage", scripture: "2 Timothy 1:7", audience: "young women finding their voice", struggle: "fear, perfectionism, imposter feelings, and shrinking back", truth: "practice courage rooted in God’s power, love, and sound judgment", outcome: "speak, lead, and serve with holy confidence" },
  { key: "wellness", category: "Mental & Emotional Wellness", shortName: "Wellness", scripture: "1 Peter 5:7", audience: "college women carrying emotional pressure", struggle: "anxiety, burnout, isolation, grief, and the fear of asking for help", truth: "bring their cares to God while receiving wise, compassionate support", outcome: "build healthy rhythms of prayer, rest, community, and professional care" },
  { key: "digital", category: "Digital Wellness & Comparison", shortName: "Digital Wisdom", scripture: "Romans 12:2", audience: "women navigating social media", struggle: "comparison, validation-seeking, cyberbullying, and unhealthy online habits", truth: "renew their minds and use digital spaces without surrendering their identity", outcome: "create online lives marked by wisdom, truth, boundaries, and encouragement" },
  { key: "sisterhood", category: "Sisterhood & Belonging", shortName: "Sisterhood", scripture: "1 Thessalonians 5:11", audience: "women longing for authentic community", struggle: "loneliness, exclusion, competition, gossip, and distrust", truth: "build one another up as sisters rather than treating one another as threats", outcome: "create communities where women feel welcomed, protected, celebrated, and accountable" },
  { key: "persistence", category: "College Persistence", shortName: "Persistence", scripture: "Galatians 6:9", audience: "college students at risk of stopping out", struggle: "financial pressure, academic setbacks, family responsibilities, and discouragement", truth: "keep doing good and seek support without shame when the journey becomes difficult", outcome: "remain enrolled, recover from setbacks, and move toward graduation with hope" },
  { key: "academics", category: "Academic Stewardship", shortName: "Academic Purpose", scripture: "Colossians 3:23", audience: "students developing strong academic habits", struggle: "procrastination, low confidence, poor time management, and fear of failure", truth: "approach learning wholeheartedly as stewardship rather than a measure of personal worth", outcome: "study with discipline, ask for help early, and pursue excellence without perfectionism" },
  { key: "financial", category: "Financial Wisdom", shortName: "Stewardship", scripture: "Proverbs 21:5", audience: "young women learning to manage money", struggle: "financial stress, shame, misinformation, debt, and limited access to guidance", truth: "practice patient planning, honest stewardship, and wise help-seeking", outcome: "make informed financial choices that support stability, generosity, and college completion" },
  { key: "relationships", category: "Healthy Relationships & Boundaries", shortName: "Healthy Love", scripture: "Proverbs 4:23", audience: "women building friendships, family relationships, and dating lives", struggle: "people-pleasing, unsafe dynamics, weak boundaries, and confusion about healthy love", truth: "guard their hearts with wisdom while practicing grace, honesty, and respect", outcome: "recognize healthy relationships and choose boundaries that protect dignity and peace" },
  { key: "leadership", category: "Leadership & Voice", shortName: "Leadership", scripture: "Esther 4:14", audience: "emerging women leaders", struggle: "silence, self-doubt, tokenism, and uncertainty about using influence", truth: "recognize that their voice and position can serve God’s purpose in this moment", outcome: "lead with courage, humility, preparation, integrity, and service" },
  { key: "service", category: "Service & Compassion", shortName: "Compassion", scripture: "Matthew 5:16", audience: "women ready to turn faith into action", struggle: "performative service, compassion fatigue, disconnection, and not knowing where to begin", truth: "let their light point back to God through consistent, dignifying service", outcome: "meet real needs with humility, partnership, follow-through, and love" },
  { key: "calling", category: "Purpose, Calling & Career", shortName: "Calling", scripture: "Proverbs 3:5–6", audience: "students discerning purpose and career", struggle: "pressure to have every answer, fear of choosing wrong, and comparison with others’ timelines", truth: "trust God while taking wise, prepared steps toward the work placed before them", outcome: "connect gifts, education, service, and career decisions to a life of purpose" },
  { key: "discipleship", category: "Faith, Prayer & Discipleship", shortName: "Faith", scripture: "John 15:5", audience: "young women growing in their relationship with Jesus", struggle: "spiritual inconsistency, shame, distraction, and trying to grow alone", truth: "abide in Christ through Scripture, prayer, worship, obedience, and community", outcome: "develop a sustainable faith that shapes daily choices and loving service" },
  { key: "advocacy", category: "Community Advocacy & Justice", shortName: "Justice", scripture: "Micah 6:8", audience: "women called to advocate for their communities", struggle: "inequity, unheard stories, limited resources, and the temptation to act without listening", truth: "pursue justice, love mercy, and walk humbly with God", outcome: "advocate with truth, dignity, partnership, and solutions shaped by the people affected" },
];

const actions = [
  { title: "TEACH THE TRUTH", build: (focus: PlatformFocus) => `Teach ${focus.audience} to ${focus.truth}, using ${focus.scripture} as the biblical foundation.` },
  { title: "START THE CONVERSATION", build: (focus: PlatformFocus) => `Create honest, Christ-centered conversations that name ${focus.struggle} and replace silence with truth, compassion, and hope.` },
  { title: "BUILD A TOOLKIT", build: (focus: PlatformFocus) => `Develop a practical resource toolkit that helps ${focus.audience} take small, repeatable steps to ${focus.outcome}.` },
  { title: "HOST THE WORKSHOP", build: (focus: PlatformFocus) => `Host an interactive campus, church, or virtual workshop where ${focus.audience} learn Scripture, skills, and next steps related to ${focus.category.toLowerCase()}.` },
  { title: "CREATE MENTORSHIP", build: (focus: PlatformFocus) => `Connect ${focus.audience} with trusted mentors and sister circles that encourage them to ${focus.outcome}.` },
  { title: "SERVE WITH DIGNITY", build: (focus: PlatformFocus) => `Organize a service initiative that responds to ${focus.struggle} while protecting dignity, listening first, and pointing participants toward lasting support.` },
  { title: "SHARE THE TESTIMONY", build: (focus: PlatformFocus) => `Launch a testimony campaign showing how faith, wise support, and courageous action can help women move from ${focus.struggle} toward ${focus.outcome}.` },
  { title: "PARTNER FOR IMPACT", build: (focus: PlatformFocus) => `Partner with churches, campus organizations, professionals, and community groups to expand trustworthy support around ${focus.category.toLowerCase()}.` },
  { title: "EQUIP THE SUPPORT CIRCLE", build: (focus: PlatformFocus) => `Teach friends, families, mentors, and leaders how to recognize ${focus.struggle} and respond with prayer, practical help, healthy boundaries, and appropriate referrals.` },
  { title: "BUILD THE LEGACY", build: (focus: PlatformFocus) => `Create a repeatable annual challenge, resource, or sisterhood initiative that continues helping ${focus.audience} ${focus.outcome} after pageant week ends.` },
];

export const platformIdeaCategories = focuses.map(({ key, category, scripture }) => ({ key, category, scripture }));

export const christCenteredPlatformIdeas: ChristCenteredPlatformIdea[] = focuses.flatMap((focus, focusIndex) =>
  actions.map((action, actionIndex) => ({
    id: focusIndex * actions.length + actionIndex + 1,
    category: focus.category,
    categoryKey: focus.key,
    scripture: focus.scripture,
    title: `${action.title}: ${focus.shortName}`,
    statement: action.build(focus),
  })),
);

export const CHRIST_CENTERED_PLATFORM_IDEA_COUNT = 140;

if (christCenteredPlatformIdeas.length !== CHRIST_CENTERED_PLATFORM_IDEA_COUNT) {
  throw new Error(`Expected ${CHRIST_CENTERED_PLATFORM_IDEA_COUNT} Christ-centered platform ideas.`);
}

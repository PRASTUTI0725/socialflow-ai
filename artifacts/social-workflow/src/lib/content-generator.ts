import { BrandProfile, applyBrandVoice, applyBrandHook } from './brand-memory';

export interface StrategyInput {
  niche: string;
  customNiche?: string;
  platforms: string[];
  goal: string;
  targetAudience: string;
  tone: string;
  contentFocus: string;
  extraContext?: string;
}

export interface CalendarDay {
  day: number;
  type: string;
  idea: string;
  format: string;
}

export interface ExecutionStep {
  step: number;
  tool: string;
  action: string;
  prompt: string;
}

export interface ProfileScore {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface StrategyOutput {
  id: string;
  settings: StrategyInput;
  createdAt: Date;
  ideas: string[];
  hooks: string[];
  captions: string[];
  brandAwareCaptions: string[];
  brandAwareHooks: string[];
  reels: string[];
  hashtags: Record<string, string[]>;
  calendar: CalendarDay[];
  executionGuide: ExecutionStep[];
  brandProfileUsed: string | null;
  hiddenAnalysis: {
    problems: string[];
    opportunities: string[];
  };
}

const NICHE_TEMPLATES: Record<string, any> = {
  "Fitness": {
    ideas: [
      "5-minute home mobility routine", "Grocery haul for bulking season", "Transformation before & after story",
      "Biggest myth about protein powders", "Form check: How to properly deadlift", "What I eat in a day (realistic)",
      "Gym bag essentials 2025", "Overcoming gym anxiety as a beginner", "3 stretches for lower back pain", "Why you're not seeing progress"
    ],
    hooks: [
      "I tried the [diet] for 30 days and here's what actually happened...", "The one exercise 90% of people get wrong at the gym.",
      "Your gym is lying to you about this...", "I lost 20lbs doing this ONE specific thing.", "Most people quit fitness because of this exact reason.",
      "Stop doing crunches right now. Do this instead.", "My personal trainer told me this, and I didn't believe them until...",
      "What nobody tells you about getting fit in your 30s.", "I tested 5 popular pre-workouts so you don't have to.",
      "The lazy person's guide to building muscle."
    ],
    captions: [
      "Consistency over intensity. Read that again. 👇\n\nWhen I first started my journey, I thought I had to go 100% every single day. I burnt out in 3 weeks. Now? I aim for 80% effort, but I show up 100% of the time. Save this as your reminder to pace yourself this week. 🚀",
      "Are you making this common deadlift mistake? 🛑\n\nMost beginners pull entirely from their lower back instead of driving through their legs. Next time you're on the platform, imagine pushing the floor away from you rather than lifting the bar up. Tag a gym buddy who needs this cue! 💪",
      "Let's talk about gym anxiety. It's real, and it's okay. 🧘‍♀️\n\nEveryone in that weight room started exactly where you are right now. The biggest guy in the room? He was once struggling with the empty bar. Put your headphones in, grab your playlist, and focus on YOU. You belong there.",
      "My exact grocery list for a lean bulk. 🛒\n\nNo complicated recipes, no expensive supplements. Just whole foods that hit your macros. Swipe to see my top 5 non-negotiable items I grab every Sunday. Which one is your favorite?",
      "POV: You finally stopped letting the scale dictate your worth. 📈\n\nThe scale doesn't measure muscle gained, energy levels improved, or confidence built. Throw it away for 30 days and watch your relationship with fitness completely transform."
    ],
    reels: [
      "Morning gym routine speed edit (aesthetic transitions)", "Voiceover: Letter to my past self before the weight loss",
      "POV: Trying to find an open bench on Monday at 5PM", "Quick 10-minute dumbbell-only home workout", "3 easy high-protein breakfast recipes"
    ],
    hashtags: {
      "Broad": ["#FitnessMotivation", "#GymLife", "#HealthyLiving", "#WorkoutRoutine", "#FitFam"],
      "Niche": ["#StrengthTraining", "#HomeWorkout", "#MacroFriendly", "#MobilityWork"],
      "Action": ["#TrainHard", "#GetStrong", "#NeverSkipMonday"]
    }
  },
  "Tech": {
    ideas: [
      "Top 5 productivity apps for 2025", "How I automate my email workflow", "Desk setup tour for remote work",
      "Why I switched from Mac to PC (or vice versa)", "Review of the latest AI coding assistant", "Tech industry career advice for juniors",
      "Must-have VS Code extensions", "Explaining complex tech concepts simply", "Gadget unboxing and first impressions", "Predictions for tech in 5 years"
    ],
    hooks: [
      "This single AI tool saved me 10 hours this week alone.", "The app everyone will be using by the end of the year.",
      "Stop using [popular tool], use this instead. It's free.", "I automated my entire morning workflow with a simple script.",
      "The most underrated developer tool nobody talks about.", "ChatGPT can't do this, but this hidden tool can.",
      "My $5000 vs my $500 tech setup comparison.", "The biggest coding mistake I see every junior developer make.",
      "Why most tech YouTubers are completely wrong about...", "This keyboard shortcut changed my life."
    ],
    captions: [
      "Burnout in tech is real. Let's talk about it. 🔋\n\nWe glorify the hustle, the late-night commits, the endless side projects. But your code quality directly correlates to your rest quality. Shut the laptop. Take a walk. The bugs will be there tomorrow. Share this with a dev who needs a break. 👇",
      "If you're still using standard search, you're falling behind. 🔍\n\nAI isn't replacing developers; developers using AI are replacing developers who don't. Swipe for the 3 prompts I use daily to cut my debugging time in half. Save this for your next sprint! 💻",
      "My complete 2025 WFH Desk Setup. 🖥️\n\nAfter 4 years of remote work, I finally perfected the ergonomics. The secret? It's not the expensive monitor, it's the chair and the lighting. Check the link in my bio for the full gear list.",
      "Unpopular opinion: You don't need to learn a new framework every month. 🛑\n\nMaster the fundamentals. JavaScript vanilla, basic architecture, and clean code principles will outlast whatever trendy framework dropped yesterday. Agree or disagree? Let me know in the comments.",
      "I built an app in 48 hours using only AI tools. Here's what happened. 🤖\n\nIt wasn't perfect, the code was messy, but it shipped. The barrier to entry for building products has never been lower. Stop overthinking and start building. What's your next project idea?"
    ],
    reels: [
      "Aesthetic desk setup b-roll with lofi beats", "Screen recording: 3 hidden features in MacOS",
      "POV: When the code works on the first try", "Day in the life of a software engineer (realistic)",
      "Unboxing the newest tech gadget ASMR style"
    ],
    hashtags: {
      "Broad": ["#TechTrends", "#SoftwareEngineering", "#TechSetup", "#DeveloperLife", "#Technology"],
      "Niche": ["#WebDev", "#ProductivityTools", "#AITools", "#RemoteWorkSetup"],
      "Action": ["#CodeNewbie", "#LearnToCode", "#BuildInPublic"]
    }
  }
};

const GENERIC_TEMPLATE = {
  ideas: ["Behind the scenes of our process", "Client success story", "Top 3 mistakes in our industry", "How we started", "Industry predictions for this year", "Q&A answering common questions", "Day in the life", "Tips & tricks roundup", "Why quality matters in this space", "A deep dive into our core service"],
  hooks: ["The biggest lie you've been told about this industry...", "Here's exactly how we achieved [result] for a client.", "Stop doing this one thing if you want better results.", "The secret weapon professionals use that you don't.", "3 things I wish I knew before starting in this field.", "Why your current approach isn't working.", "The ultimate guide to mastering...", "Don't hire a professional until you watch this.", "I spent 5 years learning this so you don't have to.", "The most overlooked aspect of our industry."],
  captions: [
    "Success doesn't happen overnight. It's a series of small, consistent actions. 👇\n\nWe spent years refining our process to ensure our clients get the best possible outcome. Today, I'm pulling back the curtain to show you exactly how we do it. Save this post for your own reference!",
    "Are you making this critical error? 🛑\n\nWe see it all the time. People skip the foundational steps and rush to the finish line. Swipe left to see the 3-step framework we use to guarantee results every single time. Have questions? Drop them below! 👇",
    "Client Spotlight! 🌟\n\nWhen [Client Name] came to us, they were struggling with [Problem]. Within 3 months of implementing our strategy, they saw a 40% increase in [Metric]. We couldn't be prouder of their hard work. Link in bio to read the full case study.",
    "Unpopular opinion time. 🗣️\n\nMost people in our industry will tell you that you need [trendy thing]. The truth? You just need consistency and a solid foundation. Let's go back to basics. What's one foundational habit you're focusing on this week?",
    "A day in the life at our office. ☕\n\nIt's not all glamorous. There's a lot of coffee, strategy meetings, and heads-down focus time. But seeing our clients succeed makes every challenging moment worth it. Thank you for being part of our community!"
  ],
  reels: ["Behind the scenes fast-paced compilation", "3 tips talking head video", "Before and after transformation", "Day in the life mini-vlog", "Debunking a common myth"],
  hashtags: {
    "Broad": ["#IndustryExpert", "#BusinessTips", "#ProfessionalServices", "#SuccessMindset", "#Growth"],
    "Niche": ["#ExpertAdvice", "#ClientSuccess", "#BehindTheScenes", "#IndustryInsights"],
    "Action": ["#LearnWithUs", "#GrowYourBusiness", "#TakeAction"]
  }
};

export function generateContent(input: StrategyInput, brandProfile?: BrandProfile | null): StrategyOutput {
  const template = NICHE_TEMPLATES[input.niche] || GENERIC_TEMPLATE;

  // Generate 30-day calendar
  const contentTypes = input.contentFocus === 'Reels' ? ['Reel'] :
    input.contentFocus === 'Posts' ? ['Carousel', 'Single Post'] :
      ['Reel', 'Carousel', 'Single Post', 'Story'];

  const calendar: CalendarDay[] = Array.from({ length: 30 }).map((_, i) => {
    const day = i + 1;
    const type = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const ideaPool = template.ideas;
    const idea = ideaPool[day % ideaPool.length];

    let format = "Educational";
    if (day % 7 === 0) format = "Personal/Behind the Scenes";
    if (day % 5 === 0) format = "Promotional";
    if (day % 3 === 0) format = "Engagement/Question";

    return { day, type, idea, format };
  });

  const executionGuide: ExecutionStep[] = [
    {
      step: 1,
      tool: "ChatGPT",
      action: "Expand Content Ideas",
      prompt: `I'm creating content for ${input.niche} targeting ${input.targetAudience}. Take these 10 content ideas and expand each into 3 sub-topics with a unique angle:\n${template.ideas.join('\n')}`
    },
    {
      step: 2,
      tool: "Perplexity AI",
      action: "Trend Research",
      prompt: `What are the top trending topics and viral content formats in the ${input.niche} space this month? Focus on ${input.platforms.join(', ')}.`
    },
    {
      step: 3,
      tool: "Claude",
      action: "Refine Long-Form Captions",
      prompt: `Here are 5 rough caption drafts for ${input.niche} content. Rewrite each to match a ${input.tone} brand voice, add a strong CTA, and optimize for engagement on ${input.platforms.join(', ')}:\n${template.captions.join('\n')}`
    },
    {
      step: 4,
      tool: "Canva",
      action: "Design Visuals",
      prompt: `Create carousel post templates (1080x1080px) using brand colors. Suggested designs based on top content ideas from ${input.niche}: ${template.ideas.slice(0, 3).join(', ')}`
    },
    {
      step: 5,
      tool: "Buffer / Meta Suite",
      action: "Schedule & Publish",
      prompt: `Schedule the following content types according to the 30-day calendar. Best posting times for ${input.platforms[0] || 'social media'}: Morning (8-10am) or Evening (6-8pm) depending on your specific audience insights.`
    }
  ];

  // Brand-aware outputs — apply brand voice transformations if a profile is active
  const brandAwareCaptions = brandProfile
    ? template.captions.map((c: string) => applyBrandVoice(c, brandProfile))
    : template.captions.map((c: string) => applyBrandVoice(c, {
        id: 'default',
        brandName: '',
        niche: input.niche,
        targetAudience: input.targetAudience,
        tone: input.tone,
        writingStyle: 'educational',
        dos: [],
        donts: [],
        pastContent: '',
        keywords: [],
        themes: [],
        createdAt: new Date().toISOString(),
      }));

  const brandAwareHooks = brandProfile
    ? template.hooks.map((h: string) => applyBrandHook(h, brandProfile))
    : template.hooks;

  return {
    id: Math.random().toString(36).substr(2, 9),
    settings: input,
    createdAt: new Date(),
    ideas: template.ideas,
    hooks: template.hooks,
    captions: template.captions,
    brandAwareCaptions,
    brandAwareHooks,
    reels: template.reels,
    hashtags: template.hashtags,
    calendar,
    executionGuide,
    brandProfileUsed: brandProfile?.id ?? null,
    hiddenAnalysis: {
      problems: ["Low organic reach in this niche", "High competition for short-form video", "Audience fatigue with standard formats"],
      opportunities: ["Leveraging educational carousels", "Building community via authentic storytelling", "Cross-platform repurposing"]
    }
  };
}

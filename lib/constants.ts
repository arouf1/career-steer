export const JOURNEY_LANES = {
  career_switch: {
    label: "Career Switch",
    description: "Move from your current role into a new one",
    colour: "#4F46E5",
  },
  promotion: {
    label: "Promotion Path",
    description: "Level up where you are",
    colour: "#16A34A",
  },
  job_search: {
    label: "Job Search Sprint",
    description: "Land your next role faster",
    colour: "#D97706",
  },
  career_clarity: {
    label: "Career Clarity",
    description: "Figure out what you actually want",
    colour: "#8B5CF6",
  },
} as const;

export type JourneyLane = keyof typeof JOURNEY_LANES;

export const STEP_TYPES = {
  cv_rewrite: { label: "CV Rewrite", icon: "FileText" },
  linkedin_rewrite: { label: "LinkedIn Rewrite", icon: "Linkedin" },
  interview_prep: { label: "Interview Prep", icon: "MessageSquare" },
  gap_analysis: { label: "Gap Analysis", icon: "BarChart3" },
  skill_plan: { label: "Skill Plan", icon: "BookOpen" },
  networking: { label: "Networking", icon: "Users" },
  application: { label: "Application", icon: "Send" },
  reflection: { label: "Reflection", icon: "Pencil" },
  evidence_capture: { label: "Evidence Capture", icon: "Trophy" },
  manager_prep: { label: "Manager Conversation", icon: "UserCheck" },
  values_assessment: { label: "Values Assessment", icon: "Heart" },
  custom: { label: "Custom", icon: "Sparkles" },
} as const;

export type StepType = keyof typeof STEP_TYPES;

export const RATE_LIMITS = {
  dailyGenerations: 20,
  dailyChatMessages: 100,
} as const;

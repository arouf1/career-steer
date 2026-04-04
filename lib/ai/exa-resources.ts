import Exa from "exa-js";
import type { GapAnalysisLlmOutput, EnrichedResource } from "./schemas";

type ResourceIntent = GapAnalysisLlmOutput["suggestedResources"][number];

const DOMAIN_MAP: Record<string, string[]> = {
  course: [
    "coursera.org",
    "udemy.com",
    "edx.org",
    "pluralsight.com",
    "skillshare.com",
    "futurelearn.com",
    "khanacademy.org",
  ],
  book: ["amazon.co.uk", "amazon.com", "goodreads.com"],
  project: ["github.com"],
  community: [
    "reddit.com",
    "stackoverflow.com",
    "meetup.com",
  ],
};

const RESULTS_PER_QUERY = 5;

function twoYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split("T")[0];
}

async function searchForSkill(
  exa: Exa,
  intent: ResourceIntent,
): Promise<EnrichedResource[]> {
  const domains = DOMAIN_MAP[intent.type];

  const response = await exa.search(intent.searchQuery, {
    numResults: RESULTS_PER_QUERY,
    startPublishedDate: twoYearsAgo(),
    ...(domains ? { includeDomains: domains } : {}),
    contents: {
      summary: { query: `${intent.type} for learning ${intent.skill}` },
    },
  });

  if (response.results.length === 0) {
    return [
      {
        skill: intent.skill,
        title: intent.searchQuery,
        description: `Search for: ${intent.searchQuery}`,
        type: intent.type,
      },
    ];
  }

  return response.results.map((result) => ({
    skill: intent.skill,
    title: result.title ?? intent.searchQuery,
    url: result.url,
    favicon: result.favicon ?? undefined,
    description:
      result.summary?.trim() ||
      `Recommended ${intent.type} for ${intent.skill}`,
    type: intent.type,
  }));
}

export async function enrichResources(
  intents: ResourceIntent[],
): Promise<EnrichedResource[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return intents.map((intent) => ({
      skill: intent.skill,
      title: intent.searchQuery,
      description: `Search for: ${intent.searchQuery}`,
      type: intent.type,
    }));
  }

  const exa = new Exa(apiKey);

  const settled = await Promise.allSettled(
    intents.map((intent) => searchForSkill(exa, intent)),
  );

  return settled.flatMap((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const intent = intents[i];
    return [
      {
        skill: intent.skill,
        title: intent.searchQuery,
        description: `Search for: ${intent.searchQuery}`,
        type: intent.type,
      },
    ];
  });
}

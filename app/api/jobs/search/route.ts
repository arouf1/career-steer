import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export interface JobResult {
  title: string;
  companyName: string;
  location: string;
  description: string;
  salary?: string;
  schedule?: string;
  postedAt?: string;
  applyLink?: string;
  shareLink?: string;
  highlights?: {
    qualifications?: string[];
    responsibilities?: string[];
  };
  thumbnail?: string;
}

interface SerpApiJobResult {
  title: string;
  company_name: string;
  location: string;
  description: string;
  share_link?: string;
  thumbnail?: string;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    salary?: string;
    schedule_type?: string;
  };
  job_highlights?: Array<{
    title: string;
    items: string[];
  }>;
  apply_options?: Array<{
    title: string;
    link: string;
  }>;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json({ error: "Query parameter q is required" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SerpAPI key not configured" },
      { status: 500 },
    );
  }

  const location = req.nextUrl.searchParams.get("location") ?? undefined;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", q.trim());
  url.searchParams.set("api_key", apiKey);
  if (location) {
    url.searchParams.set("location", location);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `SerpAPI error ${response.status}: ${body.slice(0, 500)}`,
    );
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    jobs_results?: SerpApiJobResult[];
  };

  const jobs: JobResult[] = (data.jobs_results ?? []).map((job) => {
    const qualifications = job.job_highlights?.find(
      (h) => h.title === "Qualifications",
    );
    const responsibilities = job.job_highlights?.find(
      (h) => h.title === "Responsibilities",
    );

    return {
      title: job.title,
      companyName: job.company_name,
      location: job.location,
      description: job.description,
      salary: job.detected_extensions?.salary,
      schedule: job.detected_extensions?.schedule_type,
      postedAt: job.detected_extensions?.posted_at,
      applyLink: job.apply_options?.[0]?.link,
      shareLink: job.share_link,
      thumbnail: job.thumbnail,
      highlights: {
        qualifications: qualifications?.items,
        responsibilities: responsibilities?.items,
      },
    };
  });

  return NextResponse.json(jobs);
}

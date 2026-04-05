"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@/hooks/use-suspense-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  MapPin,
  PoundSterling,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { LocationValue } from "@/lib/location";
import { getLocationCanonical } from "@/lib/location";

interface JobResult {
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

interface JobListingsProps {
  journeyId: Id<"journeys">;
  targetRole: string;
  userLocation: LocationValue;
  onJobSearchId?: (id: Id<"jobSearches"> | null) => void;
  onJobsFetched?: (jobs: JobResult[]) => void;
}

export type { JobResult };

export function JobListings({
  journeyId,
  targetRole,
  userLocation,
  onJobSearchId,
  onJobsFetched,
}: JobListingsProps) {
  const cached = useSuspenseQuery(api.jobSearches.getLatest, { journeyId });
  const saveJobs = useMutation(api.jobSearches.save);

  const [freshJobs, setFreshJobs] = useState<JobResult[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasFetchedRef = useRef(false);

  const jobs: JobResult[] = freshJobs ?? cached?.jobs ?? [];
  const isLoading = isFetching;

  const onJobSearchIdRef = useRef(onJobSearchId);
  onJobSearchIdRef.current = onJobSearchId;
  const onJobsFetchedRef = useRef(onJobsFetched);
  onJobsFetchedRef.current = onJobsFetched;

  useEffect(() => {
    if (cached?._id) {
      onJobSearchIdRef.current?.(cached._id);
    }
    if (cached?.jobs && !freshJobs) {
      onJobsFetchedRef.current?.(cached.jobs);
    }
  }, [cached, freshJobs]);

  const propsRef = useRef({ targetRole, userLocation, journeyId });
  propsRef.current = { targetRole, userLocation, journeyId };
  const saveJobsRef = useRef(saveJobs);
  saveJobsRef.current = saveJobs;

  const fetchAndSave = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    const { targetRole: role, userLocation: loc, journeyId: jId } =
      propsRef.current;
    const canonical = getLocationCanonical(loc);
    const params = new URLSearchParams({ q: role });
    if (canonical) params.set("location", canonical);

    try {
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");

      const data = (await res.json()) as JobResult[];
      setFreshJobs(data);
      setActiveIndex(0);
      onJobsFetchedRef.current?.(data);

      const searchId = await saveJobsRef.current({
        journeyId: jId,
        query: role,
        location: canonical || undefined,
        jobs: data,
      });
      onJobSearchIdRef.current?.(searchId);
    } catch {
      setError("Could not load job listings. Please try again later.");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;

    if (!cached || cached.isStale) {
      hasFetchedRef.current = true;
      fetchAndSave();
    }
  }, [cached, fetchAndSave]);

  const activeJob = jobs[activeIndex];

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
      <div className="rounded-xl border border-border bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Related Jobs
              </h3>
              {!isLoading && jobs.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {jobs.length}
                </Badge>
              )}
            </div>
            {sectionOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-5 pb-5 pt-4">
            {isLoading && <JobListingsSkeleton />}

            {!isLoading && error && (
              <div className="rounded-lg bg-muted/50 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    hasFetchedRef.current = false;
                    fetchAndSave();
                  }}
                >
                  Try again
                </Button>
              </div>
            )}

            {!isLoading && !error && jobs.length === 0 && (
              <div className="rounded-lg bg-muted/50 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No jobs found for this role in your area.
                </p>
              </div>
            )}

            {!isLoading && !error && jobs.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-1">
                  {jobs.map((job, i) => (
                    <button
                      key={`${job.companyName}-${job.title}-${i}`}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        i === activeIndex
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {job.thumbnail ? (
                        <img
                          src={job.thumbnail}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded object-contain"
                        />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="max-w-[120px] truncate">
                        {job.companyName}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-muted-foreground">
                    {activeIndex + 1} of {jobs.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={activeIndex === 0}
                      onClick={() => setActiveIndex((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={activeIndex === jobs.length - 1}
                      onClick={() => setActiveIndex((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {activeJob && <JobDetail job={activeJob} />}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function formatDescription(raw: string): string[] {
  return raw
    .split(/(?:\n|(?:\s*•\s*))+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function JobDetail({ job }: { job: JobResult }) {
  const paragraphs = formatDescription(job.description);
  const hasHighlights =
    (job.highlights?.qualifications?.length ?? 0) > 0 ||
    (job.highlights?.responsibilities?.length ?? 0) > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      const hasMore = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
      setCanScroll(hasMore);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [job]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-3">
        {job.thumbnail ? (
          <img
            src={job.thumbnail}
            alt={`${job.companyName} logo`}
            className="h-10 w-10 shrink-0 rounded-md bg-muted object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground leading-tight">
            {job.title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {job.companyName}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
            {job.salary && (
              <span className="flex items-center gap-1">
                <PoundSterling className="h-3 w-3" />
                {job.salary}
              </span>
            )}
            {job.postedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {job.postedAt}
              </span>
            )}
          </div>
          {job.schedule && (
            <Badge variant="outline" className="mt-2 text-xs">
              {job.schedule}
            </Badge>
          )}
        </div>
      </div>

      <div className="relative mt-4">
      <div ref={scrollRef} className="job-scroll max-h-64 space-y-2 overflow-y-auto">
        {hasHighlights ? (
          <>
            {job.highlights!.qualifications &&
              job.highlights!.qualifications.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Qualifications
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-xs leading-relaxed text-foreground">
                    {job.highlights!.qualifications.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            {job.highlights!.responsibilities &&
              job.highlights!.responsibilities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Responsibilities
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-xs leading-relaxed text-foreground">
                    {job.highlights!.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
          </>
        ) : (
          paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-foreground"
            >
              {p}
            </p>
          ))
        )}
      </div>
      {canScroll && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 rounded-b-lg bg-gradient-to-t from-card to-transparent" />
      )}
      </div>

      {/* {job.applyLink && (
        <div className="mt-3">
          <a
            href={job.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent-foreground hover:underline"
          >
            Apply
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )} */}
      {job.shareLink && (
        <div className="mt-3 border-t border-border pt-3">
          <a
            href={job.shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
          >
            View on Google
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function JobListingsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>
      <div className="rounded-lg border border-border p-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

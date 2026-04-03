import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "nudge inactive users",
  { hourUTC: 9, minuteUTC: 0 },
  internal.journeys.checkForInactiveUsers,
);

export default crons;

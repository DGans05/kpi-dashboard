import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for alert conditions every 15 minutes
crons.interval(
  "check-alerts",
  { minutes: 15 },
  internal.alerts.checkAndTriggerAlerts
);

export default crons;

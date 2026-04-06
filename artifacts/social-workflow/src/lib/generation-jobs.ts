import { generateId } from '@/lib/utils';
import { StrategyInput } from './content-generator';

export interface GenerationJob {
  jobId: string;
  clientId: string | null; // null = no client selected
  strategyInput: StrategyInput;
  startedAt: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  completedAt?: string;
  strategyId?: string; // populated on success
  draftCount?: number; // populated if pipeline auto-created
}

const JOBS_STORAGE_KEY = 'socialflow_generation_jobs';
const DEDUP_TIMESTAMPS_KEY = 'socialflow_job_timestamps';

// Track last job creation time per client (in-memory + localStorage)
let lastJobTimestamps: Record<string, number> = {};

// Load timestamps from localStorage on initialization
try {
  const stored = localStorage.getItem(DEDUP_TIMESTAMPS_KEY);
  if (stored) {
    lastJobTimestamps = JSON.parse(stored);
  }
} catch {
  // Ignore parsing errors
}

export function loadJobs(): GenerationJob[] {
  try {
    const raw = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GenerationJob[];
  } catch {
    return [];
  }
}

export function saveJobs(jobs: GenerationJob[]): void {
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // Storage full — ignore
  }
}

export function createJob(clientId: string | null, input: StrategyInput): GenerationJob {
  const job: GenerationJob = {
    jobId: generateId(),
    clientId,
    strategyInput: input,
    startedAt: new Date().toISOString(),
    status: 'pending',
  };

  const jobs = loadJobs();
  jobs.push(job);
  
  // Max 10 jobs (FIFO eviction)
  if (jobs.length > 10) {
    jobs.shift();
  }
  
  saveJobs(jobs);
  return job;
}

export function updateJobStatus(
  jobId: string,
  status: GenerationJob['status'],
  updates?: Partial<GenerationJob>
): void {
  const jobs = loadJobs();
  const jobIndex = jobs.findIndex(j => j.jobId === jobId);
  
  if (jobIndex === -1) return;
  
  jobs[jobIndex] = {
    ...jobs[jobIndex],
    status,
    ...(updates || {}),
  };
  
  saveJobs(jobs);
}

export function getActiveJobs(): GenerationJob[] {
  return loadJobs().filter(j => j.status === 'pending');
}

export function hasPendingJobForClient(clientId: string | null): boolean {
  if (!clientId) return false;
  const jobs = loadJobs();
  return jobs.some(j => j.clientId === clientId && j.status === 'pending');
}

// Minimum time between job creations for same client (in milliseconds)
const MIN_JOB_INTERVAL_MS = 2000; // 2 seconds

export function canCreateJobForClient(clientId: string | null): { allowed: boolean; reason?: string } {
  if (!clientId) {
    return { allowed: true };
  }

  const now = Date.now();
  const lastTimestamp = lastJobTimestamps[clientId] || 0;
  const timeSinceLastJob = now - lastTimestamp;

  if (timeSinceLastJob < MIN_JOB_INTERVAL_MS) {
    const remainingMs = MIN_JOB_INTERVAL_MS - timeSinceLastJob;
    return {
      allowed: false,
      reason: `Please wait ${Math.ceil(remainingMs / 1000)}s before generating another strategy`,
    };
  }

  return { allowed: true };
}

export function recordJobCreation(clientId: string | null): void {
  if (!clientId) return;
  lastJobTimestamps[clientId] = Date.now();
  
  // Persist to localStorage for cross-session safety
  try {
    localStorage.setItem(DEDUP_TIMESTAMPS_KEY, JSON.stringify(lastJobTimestamps));
  } catch {
    // Ignore storage errors
  }
}

export function cleanupOldJobs(): void {
  const jobs = loadJobs();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const recentJobs = jobs.filter(j => j.startedAt > twentyFourHoursAgo);
  const cleanedJobs = recentJobs.slice(-10); // Keep max 10
  
  if (cleanedJobs.length !== jobs.length) {
    saveJobs(cleanedJobs);
    console.log(`[JOB_CLEANUP] Removed ${jobs.length - cleanedJobs.length} old jobs`);
  }
}

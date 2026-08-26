import type { AzureConfig, FileChange, PRReviewer } from '../types/azure';
import type { FileStats, ReviewIssue } from '../types/review';
import { getPRFileChanges, getPRReviewers } from '../api/pullRequests';
import { reviewPRWithGemini } from '../api/gemini';

export interface PRInfo {
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
}

export interface LoadPRResult {
  prInfo: PRInfo;
  files: FileChange[];
  stats: FileStats;
  reviewers: PRReviewer[];
}

export async function loadPRForReview(
  config: AzureConfig,
  prId: number
): Promise<LoadPRResult> {
  const { pr, files, stats } = await getPRFileChanges(config, prId);
  const reviewers = await getPRReviewers(config, prId);

  return {
    prInfo: {
      title: pr.title,
      description: pr.description,
      sourceRefName: pr.sourceRefName,
      targetRefName: pr.targetRefName,
    },
    files,
    stats,
    reviewers,
  };
}

export interface AIReviewResult {
  issues: ReviewIssue[];
  duration: number;
}

export async function runAIReview(
  geminiKey: string,
  prTitle: string,
  prDescription: string,
  files: FileChange[]
): Promise<AIReviewResult> {
  const startTime = Date.now();
  const issues = await reviewPRWithGemini(geminiKey, prTitle, prDescription, files);
  return {
    issues,
    duration: Date.now() - startTime,
  };
}

export interface AzureConfig {
  organization: string;
  project: string;
  repository: string;
  pat: string;
}

export interface WorkItemRef {
  id: string;
  url: string;
}

export interface WorkItemDetail {
  id: number;
  fields: {
    'System.WorkItemType': string;
    'System.Title': string;
    'System.State': string;
    'System.Tags'?: string;
  };
}

export type TargetState = 'Resolved' | 'Closed';

export type Platform = 'App' | 'Web';

export interface ProcessedWorkItem {
  id: string;
  title: string;
  type: string;
  platform: Platform;
  previousState: string;
  newState: TargetState;
  url: string;
  success: boolean;
  error?: string;
}

export interface PullRequestDetail {
  pullRequestId: number;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  lastMergeSourceCommit: { commitId: string };
  lastMergeTargetCommit: { commitId: string };
}

export interface PRIteration {
  id: number;
}

export interface PRIterationChange {
  changeType: number;
  item: {
    path: string;
    gitObjectType?: string;
  };
}

export interface FileChange {
  path: string;
  changeType: string;
  oldContent?: string;
  newContent?: string;
}

export interface PRReviewer {
  id: string;
  displayName: string;
  vote: number;
  imageUrl?: string;
  isContainer?: boolean;
}

export type PRStatusFilter = 'mine' | 'active' | 'completed' | 'abandoned';

export interface PRListItem {
  pullRequestId: number;
  title: string;
  status: string;
  createdBy: { displayName: string; id: string; imageUrl?: string };
  sourceRefName: string;
  targetRefName: string;
  creationDate: string;
  closedDate?: string;
  isDraft: boolean;
  mergeStatus?: string;
  reviewers: PRReviewer[];
  labels?: { id: string; name: string }[];
  autoCompleteSetBy?: { displayName: string };
}

export interface PRComment {
  id: number;
  content: string;
  author: { displayName: string };
  publishedDate: string;
  commentType: number;
  isDeleted?: boolean;
}

export interface PRThread {
  id: number;
  status: number;
  threadContext?: {
    filePath: string;
    rightFileStart?: { line: number; offset: number };
    rightFileEnd?: { line: number; offset: number };
  };
  comments: PRComment[];
}

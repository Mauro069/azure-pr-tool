export interface ReviewIssue {
  file: string;
  line: string;
  severity: 'bug' | 'security' | 'improvement' | 'suggestion';
  message: string;
  problem: string;
  suggestion: string;
}

export interface FileStats {
  total: number;
  reviewed: number;
  skipped: string[];
  binary: string[];
}

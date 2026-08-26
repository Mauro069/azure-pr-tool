import type { FileChange } from './azure';
import type { ReviewIssue } from './review';

export interface AIProvider {
  name: string;
  reviewPR(
    prTitle: string,
    prDescription: string,
    files: FileChange[]
  ): Promise<ReviewIssue[]>;
}

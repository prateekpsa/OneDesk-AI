/** Mirrors the KnowledgeArticles list schema. Note ArticleStatus, not Status - see build_plan.md. */
export interface IKnowledgeArticle {
  Id: number;
  Title: string;
  Department: string;
  Category?: string;
  ProblemDescription?: string;
  Symptoms?: string;
  RootCause?: string;
  Resolution?: string;
  Keywords?: string;
  SourceTicket?: string;
  ArticleOwner?: string;
  ReviewedBy?: string;
  ReviewDate?: string;
  ArticleStatus: string;
}

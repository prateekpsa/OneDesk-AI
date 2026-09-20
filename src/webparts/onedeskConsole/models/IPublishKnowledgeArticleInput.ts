/** Fields the Knowledge Review screen (Phase 4) can edit before publishing. */
export interface IPublishKnowledgeArticleInput {
  articleId: number;
  title: string;
  problemDescription?: string;
  symptoms?: string;
  rootCause?: string;
  resolution?: string;
  keywords?: string;
  sourceTicket?: string;
}

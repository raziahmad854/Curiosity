export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  imageQuery: string;
  imageCaption: string;
  imageUrl?: string;
}

export interface RelatedTopic {
  title: string;
  topic: string;
  imageQuery: string;
  imageUrl?: string;
}

export interface Article {
  title: string;
  subtitle: string;
  topic: string;
  readTime: string;
  heroImageQuery: string;
  heroImageUrl?: string;
  sections: ArticleSection[];
  relatedTopics: RelatedTopic[];
}


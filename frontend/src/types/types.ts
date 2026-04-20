export interface PaperDetails {
  abstract?: any;
  publication_year?: number;
  citation_count?: number;
  fwci?: number;
  authors: string[];
  doi?: string;
  venue?: string;
  concepts?: string[];       
}

export interface PaperNode {
  id: string;
  title: string;
  group: number;
  details: PaperDetails;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | PaperNode;
  target: string | PaperNode;
  type: string;
}

export interface CitationGraphData {
  nodes: PaperNode[];
  links: GraphLink[];
}

export interface ConceptSuggestion {
  id: string;
  display_name: string;
  level: number;
  works_count: number;
  description: string;
}
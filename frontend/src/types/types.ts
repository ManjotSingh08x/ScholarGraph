export interface PaperDetails {
  abstract?: any;
  publication_year?: number;
  citation_count?: number;
  fwci?: number;
  authors: string[];
  doi?: string;
}

export interface PaperNode {
  id: string;
  title: string;
  group: number;
  details: PaperDetails;
  // D3 dynamic properties
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
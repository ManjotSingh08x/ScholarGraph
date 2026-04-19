export interface PaperDetails {
  abstract?: any;
  publication_year?: number;
  citation_count?: number;
  fwci?: number;
  authors: string[];
  doi?: string;
  venue?: string;
  concepts?: string[];        // B: top OpenAlex concept labels for faceted UI
}

export interface PaperNode {
  id: string;
  title: string;
  group: number;
  details: PaperDetails;
  // D3 simulation mutable properties
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

// A: shape returned by /api/concepts autocomplete
export interface ConceptSuggestion {
  id: string;
  display_name: string;
  level: number;
  works_count: number;
  description: string;
}
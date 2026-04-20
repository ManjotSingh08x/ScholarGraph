import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Home, Search, ChevronRight, BookOpen, Loader2, Quote,
  Sun, Moon, ExternalLink, X, Filter, Clock, Zap, Tag,
} from 'lucide-react';
import CitationGraph from './components/CitationGraph';
import { PaperNode, CitationGraphData, ConceptSuggestion } from './types/types';

const decodeAbstract = (idx: any): string => {
  if (!idx) return 'No abstract available.';
  const words: string[] = [];
  try {
    Object.entries(idx).forEach(([w, pos]) =>
      (pos as number[]).forEach(p => (words[p] = w))
    );
    return words.join(' ');
  } catch {
    return 'Abstract currently unavailable.';
  }
};

const buildConceptFacets = (nodes: PaperNode[]): { label: string; count: number }[] => {
  const freq: Record<string, number> = {};
  nodes.forEach(n => {
    (n.details.concepts ?? []).forEach(c => { freq[c] = (freq[c] ?? 0) + 1; });
  });
  return Object.entries(freq)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
};

const buildDegreeMap = (nodes: PaperNode[], links: CitationGraphData['links']): Record<string, number> => {
  const deg: Record<string, number> = {};
  nodes.forEach(n => (deg[n.id] = 0));
  links.forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    deg[s] = (deg[s] ?? 0) + 1;
    deg[t] = (deg[t] ?? 0) + 1;
  });
  return deg;
};


const VENUE_OPTIONS: { group: string; venues: string[] }[] = [
  {
    group: 'AI / Machine Learning',
    venues: ['NeurIPS', 'ICML', 'ICLR', 'AAAI', 'IJCAI', 'UAI', 'AISTATS', 'AutoML', 'CoLLAs', 'LoG'],
  },
  {
    group: 'Computer Vision',
    venues: ['CVPR', 'ICCV', 'ECCV', 'WACV', 'BMVC', 'ACCV', 'MICCAI', 'MIDL'],
  },
  {
    group: 'Natural Language Processing',
    venues: ['ACL', 'EMNLP', 'NAACL', 'COLING', 'EACL', 'CoNLL', 'SemEval', 'LREC'],
  },
  {
    group: 'Robotics & Systems',
    venues: ['ICRA', 'IROS', 'CoRL', 'RSS', 'HRI', 'ISRR', 'ICAPS'],
  },
  {
    group: 'Data Mining & Information Retrieval',
    venues: ['KDD', 'WWW', 'SIGIR', 'WSDM', 'CIKM', 'RecSys', 'WebConf', 'ECIR'],
  },
  {
    group: 'Databases & Systems',
    venues: ['VLDB', 'SIGMOD', 'ICDE', 'EDBT', 'OSDI', 'SOSP', 'EuroSys', 'USENIX ATC', 'ASPLOS'],
  },
  {
    group: 'Theory & Algorithms',
    venues: ['STOC', 'FOCS', 'SODA', 'JACM', 'TALG', 'ITCS', 'CCC', 'APPROX'],
  },
  {
    group: 'Security & Privacy',
    venues: ['IEEE S&P', 'CCS', 'USENIX Security', 'NDSS', 'PETS', 'Euro S&P'],
  },
  {
    group: 'Human-Computer Interaction',
    venues: ['CHI', 'UIST', 'CSCW', 'IUI', 'DIS', 'ASSETS', 'MobileHCI'],
  },
  {
    group: 'Bioinformatics & Computational Biology',
    venues: [
      'Bioinformatics', 'RECOMB', 'ISMB',
      'PLOS Computational Biology', 'BMC Bioinformatics', 'Nucleic Acids Research',
    ],
  },
  {
    group: 'Multidisciplinary Science',
    venues: [
      'Nature', 'Science', 'Cell', 'PNAS',
      'Nature Communications', 'Scientific Reports', 'PLOS ONE', 'eLife',
    ],
  },
  {
    group: 'Journals — AI & ML',
    venues: [
      'Journal of Machine Learning Research',
      'Artificial Intelligence',
      'IEEE Transactions on Neural Networks and Learning Systems',
      'IEEE Transactions on Pattern Analysis and Machine Intelligence',
      'Neural Networks',
      'Machine Learning',
      'Pattern Recognition',
    ],
  },
];



const CONCEPT_OPTIONS: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: 'Core AI / ML',
    items: [
      { id: 'C154945302',  label: 'Machine Learning' },
      { id: 'C41008148',   label: 'Computer Science' },
      { id: 'C119857082',  label: 'Deep Learning' },
      { id: 'C108583219',  label: 'Reinforcement Learning' },
      { id: 'C50644808',   label: 'Artificial Intelligence' },
      { id: 'C28490314',   label: 'Transfer Learning' },
      { id: 'C16301287',   label: 'Federated Learning' },
      { id: 'C2522767166', label: 'Self-Supervised Learning' },
      { id: 'C153294291',  label: 'Contrastive Learning' },
    ],
  },
  {
    group: 'Neural Architectures',
    items: [
      { id: 'C124101348',  label: 'Neural Network' },
      { id: 'C2776035482', label: 'Transformer' },
      { id: 'C83523745',   label: 'Convolutional Neural Network' },
      { id: 'C70721614',   label: 'Recurrent Neural Network' },
      { id: 'C111903765',  label: 'Generative Adversarial Network' },
      { id: 'C139719470',  label: 'Attention Mechanism' },
      { id: 'C183720460',  label: 'Graph Neural Network' },
    ],
  },
  {
    group: 'Computer Vision',
    items: [
      { id: 'C31972630',   label: 'Computer Vision' },
      { id: 'C2987103',    label: 'Object Detection' },
      { id: 'C130183531',  label: 'Image Segmentation' },
      { id: 'C109551123',  label: 'Image Classification' },
      { id: 'C156875173',  label: 'Semantic Segmentation' },
      { id: 'C2776591716', label: 'Vision Transformer (ViT)' },
      { id: 'C2781563860', label: 'Diffusion Model' },
    ],
  },
  {
    group: 'Natural Language Processing',
    items: [
      { id: 'C204321447',  label: 'Natural Language Processing' },
      { id: 'C2776231217', label: 'Large Language Model' },
      { id: 'C87649667',   label: 'Text Classification' },
      { id: 'C188147891',  label: 'Named Entity Recognition' },
      { id: 'C130516862',  label: 'Machine Translation' },
      { id: 'C2781424028', label: 'Question Answering' },
      { id: 'C2779809',    label: 'Sentiment Analysis' },
    ],
  },
  {
    group: 'Data & Optimisation',
    items: [
      { id: 'C121332964',  label: 'Bayesian Optimisation' },
      { id: 'C37744722',   label: 'Hyperparameter Tuning' },
      { id: 'C2524010',    label: 'Data Augmentation' },
      { id: 'C47187133',   label: 'Knowledge Distillation' },
      { id: 'C44134380',   label: 'Gradient Descent' },
      { id: 'C2779778',    label: 'Regularisation' },
    ],
  },
  {
    group: 'Graphs & Networks',
    items: [
      { id: 'C183720460',  label: 'Graph Neural Network' },
      { id: 'C9206858',    label: 'Graph Theory' },
      { id: 'C149782125',  label: 'Social Network Analysis' },
      { id: 'C41183218',   label: 'Citation Network' },
      { id: 'C2779831',    label: 'Link Prediction' },
    ],
  },
  {
    group: 'Multimodal & Generation',
    items: [
      { id: 'C2776591716', label: 'Multimodal Learning' },
      { id: 'C111903765',  label: 'Image Generation' },
      { id: 'C2781563860', label: 'Text-to-Image' },
      { id: 'C2776231217', label: 'Vision-Language Model' },
      { id: 'C2779868',    label: 'Image Captioning' },
    ],
  },
  {
    group: 'Science Applications',
    items: [
      { id: 'C71924100',   label: 'Medicine' },
      { id: 'C2779415594', label: 'Drug Discovery' },
      { id: 'C104292427',  label: 'Bioinformatics' },
      { id: 'C185592680',  label: 'Climate Science' },
      { id: 'C39432304',   label: 'Astronomy' },
      { id: 'C2780378530', label: 'Materials Science' },
    ],
  },
];

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'home' | 'search' | 'graph'>('home');

  const [searchQuery,      setSearchQuery]      = useState('');
  const [startYear,        setStartYear]        = useState('');
  const [endYear,          setEndYear]          = useState('');
  const [venue,            setVenue]            = useState('');
  const [selectedConcepts, setSelectedConcepts] = useState<ConceptSuggestion[]>([]);
  const [isFiltersOpen,    setIsFiltersOpen]    = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [graphData,     setGraphData]     = useState<CitationGraphData | null>(null);
  const [selectedNode,  setSelectedNode]  = useState<PaperNode | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [activeFacets,    setActiveFacets]    = useState<Set<string>>(new Set());
  const [timelineYear,    setTimelineYear]    = useState<number | null>(null);
  const [degreeThreshold, setDegreeThreshold] = useState(0);
  const [highlightedNodes,setHighlightedNodes]= useState<Set<string>>(new Set());

  const yearRange = useMemo<[number, number] | null>(() => {
    if (!graphData) return null;
    const years = graphData.nodes
      .map(n => n.details.publication_year)
      .filter((y): y is number => typeof y === 'number');
    if (!years.length) return null;
    return [Math.min(...years), Math.max(...years)];
  }, [graphData]);

  useEffect(() => {
    if (yearRange) setTimelineYear(yearRange[1]);
  }, [yearRange]);

  const degreeMap = useMemo(
    () => (graphData ? buildDegreeMap(graphData.nodes, graphData.links) : {}),
    [graphData]
  );
  const maxDegree = useMemo(() => Math.max(0, ...Object.values(degreeMap)), [degreeMap]);
  const conceptFacets = useMemo(() => (graphData ? buildConceptFacets(graphData.nodes) : []), [graphData]);

  const visibleNodeIds = useMemo<Set<string> | null>(() => {
    if (!graphData) return null;
    const hasTimeline = timelineYear !== null && yearRange !== null && timelineYear < yearRange[1];
    const hasFacets   = activeFacets.size > 0;
    const hasDegree   = degreeThreshold > 0;
    if (!hasTimeline && !hasFacets && !hasDegree) return null;
    const ids = new Set<string>();
    graphData.nodes.forEach(n => {
      if (hasTimeline) {
        const y = n.details.publication_year;
        if (y === undefined || y === null || y > timelineYear!) return;
      }
      if (hasFacets) {
        const nc = new Set(n.details.concepts ?? []);
        if (![...activeFacets].some(f => nc.has(f))) return;
      }
      if (hasDegree && (degreeMap[n.id] ?? 0) < degreeThreshold) return;
      ids.add(n.id);
    });
    return ids;
  }, [graphData, timelineYear, yearRange, activeFacets, degreeThreshold, degreeMap]);


  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true); setView('search');
    try {
      let url = `http://localhost:5001/api/search?q=${encodeURIComponent(searchQuery)}`;
      if (startYear) url += `&start_year=${startYear}`;
      if (endYear)   url += `&end_year=${endYear}`;
      if (venue)     url += `&venue=${encodeURIComponent(venue)}`;
      if (selectedConcepts.length)
        url += `&concepts=${selectedConcepts.map(c => c.id).join(',')}`;
      const res  = await fetch(url);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } finally { setLoading(false); }
  }, [searchQuery, startYear, endYear, venue, selectedConcepts]);

  const generateGraph = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:5001/api/graph/${id}`);
      const data = await res.json();
      setGraphData(data);
      setSelectedNode(data.nodes.find((n: any) => n.group === 0) ?? data.nodes[0]);
      setView('graph');
      setActiveFacets(new Set());
      setHighlightedNodes(new Set());
      setDegreeThreshold(0);
    } finally { setLoading(false); }
  }, []);

  const addConceptFromDropdown = (raw: string) => {
    if (!raw) return;
    const sep   = raw.indexOf('|');
    const id    = raw.slice(0, sep);
    const label = raw.slice(sep + 1);
    if (!id || selectedConcepts.find(c => c.id === id)) return;
    setSelectedConcepts(prev => [
      ...prev,
      { id, display_name: label, level: 0, works_count: 0, description: '' },
    ]);
  };

  const toggleFacet = (label: string) =>
    setActiveFacets(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const toggleHighlight = (id: string) =>
    setHighlightedNodes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const resetAllFilters = () => {
    setActiveFacets(new Set());
    setDegreeThreshold(0);
    setHighlightedNodes(new Set());
    if (yearRange) setTimelineYear(yearRange[1]);
  };

  const getRelations = (type: 'references' | 'cited_by') => {
    if (!graphData || !selectedNode) return [];
    return graphData.links
      .filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return type === 'references'
          ? s === selectedNode.id && l.type === 'references'
          : t === selectedNode.id && l.type === 'cited_by';
      })
      .map(l => {
        const nId =
          type === 'references'
            ? typeof l.target === 'object' ? l.target.id : l.target
            : typeof l.source === 'object' ? l.source.id : l.source;
        return graphData.nodes.find(n => n.id === nId);
      })
      .filter(Boolean);
  };

  const anyPostFilter = visibleNodeIds !== null || degreeThreshold > 0 || highlightedNodes.size > 0;

  const sel =
    'px-4 py-2.5 bg-white border border-slate-200 focus:border-scholarBlue rounded-2xl ' +
    'outline-none text-xs font-semibold cursor-pointer appearance-none ' +
    'dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:border-neon transition-colors';

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen w-screen transition-colors duration-500 bg-white text-slate-900 dark:bg-black dark:text-white font-sans overflow-hidden">
        <header className="flex items-start px-6 py-4 bg-white border-b border-slate-100 dark:bg-black dark:border-neon/20 z-50 gap-3 flex-wrap relative">
          <button
            onClick={() => setView('home')}
            className="p-3 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-2xl shadow-lg transition-transform hover:scale-105 shrink-0 mt-0.5"
          >
            <Home size={22} />
          </button>

          <div className="flex flex-1 flex-col min-w-0">

            <div className="flex gap-2 flex-wrap items-center w-full">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-neon/40 pointer-events-none" size={17} />
                <input
                  className="w-full pl-11 pr-4 py-3 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-3xl outline-none text-sm font-semibold transition-all dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
                  placeholder="Search research papers…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && performSearch()}
                />
              </div>

              <button
                onClick={() => setIsFiltersOpen(o => !o)}
                className={`px-5 py-3 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
                  isFiltersOpen
                    ? 'bg-slate-200 border-slate-300 text-slate-800 dark:bg-zinc-800 dark:border-neon/40 dark:text-neon'
                    : 'bg-slate-100 border-transparent text-slate-600 hover:border-scholarBlue dark:bg-zinc-900 dark:text-white dark:hover:border-neon'
                }`}
              >
                ⚙️ Filters
              </button>

              <button
                onClick={performSearch}
                className="px-6 py-3 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-3xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                Search
              </button>

              <button
                onClick={() => setDarkMode(d => !d)}
                className="flex items-center gap-2 px-5 py-3 rounded-3xl bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-neon font-black text-[10px] uppercase tracking-widest border border-transparent dark:border-neon/30 transition-all active:scale-95 shadow-sm shrink-0"
              >
                {darkMode ? <><Sun size={15} /> Light</> : <><Moon size={15} /> Neon</>}
              </button>
            </div>

            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isFiltersOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr] mt-0'}`}>
              <div className="overflow-hidden">
                <div className="flex flex-wrap gap-3 p-4 bg-slate-50 border border-slate-200 rounded-3xl dark:bg-zinc-900/40 dark:border-neon/10 items-center">

                  {/* ── Start Year ── */}
                  <select value={startYear} onChange={e => setStartYear(e.target.value)} className={`w-36 ${sel}`}>
                    <option value="">📅 Start Year</option>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={`s${y}`} value={y}>{y}</option>
                    ))}
                  </select>

                  {/* ── End Year ── */}
                  <select value={endYear} onChange={e => setEndYear(e.target.value)} className={`w-36 ${sel}`}>
                    <option value="">📅 End Year</option>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={`e${y}`} value={y}>{y}</option>
                    ))}
                  </select>

                  {/* ── Venue — grouped, exhaustive ── */}
                  <select value={venue} onChange={e => setVenue(e.target.value)} className={`w-60 ${sel}`}>
                    <option value="">🏛️ Venue / Journal</option>
                    {VENUE_OPTIONS.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.venues.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <div className="w-px h-8 bg-slate-200 dark:bg-zinc-700 shrink-0" />

                  <select
                    value=""
                    onChange={e => { addConceptFromDropdown(e.target.value); e.target.value = ''; }}
                    className={`flex-1 min-w-[220px] ${sel}`}
                  >
                    <option value="">🧠 Add Concept Filter…</option>
                    {CONCEPT_OPTIONS.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map(item => {
                          const already = !!selectedConcepts.find(c => c.id === item.id);
                          return (
                            <option
                              key={item.id}
                              value={`${item.id}|${item.label}`}
                              disabled={already}
                            >
                              {already ? `✓ ${item.label}` : item.label}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>

                </div>
              </div>
            </div>

            {(startYear || endYear || venue || selectedConcepts.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {startYear && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-neon rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-neon/20">
                    From: {startYear}
                    <button onClick={() => setStartYear('')} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                  </span>
                )}
                {endYear && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-neon rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-neon/20">
                    To: {endYear}
                    <button onClick={() => setEndYear('')} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                  </span>
                )}
                {venue && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-neon rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-neon/20">
                    Venue: {venue}
                    <button onClick={() => setVenue('')} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                  </span>
                )}
                {selectedConcepts.map(c => (
                  <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-scholarBlue/10 dark:bg-neon/10 text-scholarBlue dark:text-neon rounded-full text-[10px] font-black uppercase tracking-wider border border-transparent">
                    Concept: {c.display_name}
                    <button onClick={() => setSelectedConcepts(prev => prev.filter(s => s.id !== c.id))} className="hover:text-red-500 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">

          {view === 'home' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-1000">
              <div className="bg-slate-900 dark:bg-neon p-8 rounded-[3rem] shadow-2xl text-white dark:text-black mb-10">
                <BookOpen size={64} />
              </div>
              <h1 className="text-8xl font-black tracking-tighter mb-8 italic">
                Scholar<span className="text-scholarBlue dark:text-neon">Graph.</span>
              </h1>
              <div className="max-w-2xl bg-slate-50 dark:bg-zinc-900/40 p-10 rounded-[2.5rem] border border-slate-200 dark:border-neon/20 backdrop-blur-xl shadow-xl">
                <Quote className="text-scholarBlue dark:text-neon mb-6 mx-auto opacity-40" size={32} />
                <p className="text-slate-600 dark:text-white text-xl font-medium italic leading-relaxed mb-6">
                  "Knowledge shouldn't be trapped in static lists. I built ScholarGraph to turn thousands of citations into a living, breathing map of human progress."
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[1px] w-12 bg-slate-200 dark:bg-zinc-800" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-neon/60">The Founder's Vision</span>
                  <div className="h-[1px] w-12 bg-slate-200 dark:bg-zinc-800" />
                </div>
              </div>
            </div>
          )}

          {view === 'search' && (
            <div className="flex-1 overflow-y-auto p-16 max-w-5xl mx-auto w-full animate-in slide-in-from-bottom-8">
              <h2 className="text-4xl font-black mb-10 dark:text-neon">Results</h2>
              {loading
                ? <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-scholarBlue dark:text-neon" size={48} /></div>
                : searchResults.length === 0
                  ? <div className="text-center text-slate-400 dark:text-zinc-600 font-bold italic pt-20">No results found.</div>
                  : (
                    <div className="grid gap-4">
                      {searchResults.map(p => (
                        <div key={p.id}
                          onClick={() => generateGraph(p.id.split('/').pop())}
                          className="p-8 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-neon/10 rounded-[2.5rem] hover:border-scholarBlue dark:hover:border-neon hover:shadow-2xl transition-all cursor-pointer flex justify-between items-center group"
                        >
                          <div className="flex-1 pr-10">
                            <h3 className="text-xl font-bold group-hover:text-scholarBlue dark:group-hover:text-neon transition-colors mb-2 leading-tight">{p.title}</h3>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                              {p.publication_year} · {p.cited_by_count?.toLocaleString()} citations
                              {p.primary_location?.source?.display_name ? ` · ${p.primary_location.source.display_name}` : ''}
                            </div>
                          </div>
                          <ChevronRight className="text-slate-200 dark:text-neon" size={32} />
                        </div>
                      ))}
                    </div>
                  )
              }
            </div>
          )}

          {view === 'graph' && (
            <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500">

              <aside className="w-72 bg-white border-r border-slate-100 dark:bg-black dark:border-neon/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-7">

                  {conceptFacets.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5">
                          <Tag size={10} /> Concepts
                        </h4>
                        {activeFacets.size > 0 && (
                          <button onClick={() => setActiveFacets(new Set())} className="text-[9px] font-black uppercase text-red-400 hover:text-red-500 transition-colors">
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {conceptFacets.map(f => (
                          <button key={f.label} onClick={() => toggleFacet(f.label)}
                            className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                              activeFacets.has(f.label)
                                ? 'bg-scholarBlue dark:bg-neon text-white dark:text-black'
                                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <span className="truncate pr-2">{f.label}</span>
                            <span className={`text-[9px] font-black shrink-0 ${activeFacets.has(f.label) ? 'text-white/70 dark:text-black/60' : 'text-slate-300 dark:text-zinc-600'}`}>
                              {f.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {graphData && maxDegree > 0 && (
                    <section>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5 mb-3">
                        <Zap size={10} /> Impact Threshold
                      </h4>
                      <input type="range" min={0} max={maxDegree} value={degreeThreshold}
                        onChange={e => setDegreeThreshold(Number(e.target.value))}
                        className="w-full accent-scholarBlue dark:accent-neon"
                      />
                      <div className="flex justify-between mt-1 text-[9px] font-black uppercase text-slate-400 dark:text-zinc-600">
                        <span>All</span>
                        <span className="text-scholarBlue dark:text-neon">Min deg: {degreeThreshold}</span>
                        <span>{maxDegree}</span>
                      </div>
                    </section>
                  )}

                  <section>
                    <h4 className="text-[10px] font-black uppercase mb-3 text-slate-400 dark:text-neon/30 tracking-widest">References</h4>
                    <div className="space-y-2">
                      {getRelations('references').map((n, i) => (
                        <button key={i} onClick={() => setSelectedNode(n!)}
                          className="w-full text-left text-[11px] p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all font-bold text-slate-500 dark:text-zinc-400 border border-transparent line-clamp-2 italic">
                          {n!.title}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-[10px] font-black uppercase mb-3 text-slate-400 dark:text-neon/30 tracking-widest">Citations</h4>
                    <div className="space-y-2">
                      {getRelations('cited_by').map((n, i) => (
                        <button key={i} onClick={() => setSelectedNode(n!)}
                          className="w-full text-left text-[11px] p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all font-bold text-slate-500 dark:text-zinc-400 border border-transparent line-clamp-2 italic">
                          {n!.title}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                {yearRange && (
                  <div className="border-t border-slate-100 dark:border-neon/10 p-5 shrink-0 bg-white dark:bg-black">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5 mb-3">
                      <Clock size={10} /> Timeline
                    </h4>
                    <input type="range" min={yearRange[0]} max={yearRange[1]}
                      value={timelineYear ?? yearRange[1]}
                      onChange={e => setTimelineYear(Number(e.target.value))}
                      className="w-full accent-scholarBlue dark:accent-neon"
                    />
                    <div className="flex justify-between mt-1 text-[9px] font-black uppercase text-slate-400 dark:text-zinc-600">
                      <span>{yearRange[0]}</span>
                      <span className="text-scholarBlue dark:text-neon">≤ {timelineYear ?? yearRange[1]}</span>
                      <span>{yearRange[1]}</span>
                    </div>
                    {timelineYear !== null && timelineYear < yearRange[1] && (
                      <button onClick={() => setTimelineYear(yearRange[1])}
                        className="mt-2 w-full text-[9px] font-black uppercase text-slate-400 hover:text-scholarBlue dark:hover:text-neon transition-colors text-center">
                        Reset to latest
                      </button>
                    )}
                  </div>
                )}
              </aside>

              <section className="flex-1 relative bg-slate-50 dark:bg-black overflow-hidden shadow-inner">
                {anyPostFilter && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-neon/20 rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest select-none">
                    <Filter size={11} className="text-scholarBlue dark:text-neon" />
                    <span className="text-slate-500 dark:text-zinc-400">
                      {visibleNodeIds ? `${visibleNodeIds.size} / ${graphData?.nodes.length} nodes` : 'All nodes'}
                    </span>
                    {highlightedNodes.size > 0 && (
                      <span className="text-scholarBlue dark:text-neon">{highlightedNodes.size} highlighted</span>
                    )}
                    <button onClick={resetAllFilters} className="text-red-400 hover:text-red-500 transition-colors ml-1">
                      <X size={11} />
                    </button>
                  </div>
                )}

                {graphData && (
                  <CitationGraph
                    data={graphData}
                    onNodeClick={setSelectedNode}
                    onNodeCtrlClick={node => toggleHighlight(node.id)}
                    selectedId={selectedNode?.id}
                    isDark={darkMode}
                    visibleNodeIds={visibleNodeIds}
                    highlightedNodeIds={highlightedNodes}
                    degreeMap={degreeMap}
                  />
                )}

                {loading && (
                  <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Loader2 className="animate-spin text-scholarBlue dark:text-neon" size={48} />
                  </div>
                )}

                <div className="absolute bottom-4 right-4 text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-zinc-700 select-none">
                  Ctrl+click node to highlight path
                </div>
              </section>

              <aside className="w-[28rem] bg-white border-l border-slate-100 dark:bg-black dark:border-neon/10 p-10 overflow-y-auto shadow-2xl z-20">
                {selectedNode ? (
                  <div className="space-y-7 animate-in slide-in-from-right">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-3 tracking-tight uppercase">
                        {selectedNode.title}
                      </h2>
                      <p className="text-xs font-bold text-blue-600 dark:text-neon mb-1">
                        {selectedNode.details.authors?.join(', ')}
                      </p>
                      <p className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] leading-relaxed">
                        {selectedNode.details.publication_year}
                        {selectedNode.details.venue && selectedNode.details.venue !== 'Unknown Venue' && (
                          <> · <span className="text-scholarBlue dark:text-neon/80">{selectedNode.details.venue}</span></>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'FWCI',      value: selectedNode.details.fwci?.toFixed(2) ?? '—', accent: true },
                        { label: 'Citations', value: selectedNode.details.citation_count?.toLocaleString() ?? '—', accent: false },
                        { label: 'Degree',    value: String(degreeMap[selectedNode.id] ?? 0), accent: false },
                        { label: 'Level',     value: `L${selectedNode.group}`, accent: false },
                      ].map(({ label, value, accent }) => (
                        <div key={label} className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-3xl border border-slate-100 dark:border-neon/10">
                          <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase mb-1">{label}</span>
                          <span className={`text-xl font-black ${accent ? 'text-blue-600 dark:text-neon' : 'text-slate-900 dark:text-white'}`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(selectedNode.details.concepts ?? []).length > 0 && (
                      <div>
                        <h4 className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 tracking-widest">Concepts</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedNode.details.concepts ?? []).map(c => (
                            <button key={c} onClick={() => toggleFacet(c)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                activeFacets.has(c)
                                  ? 'bg-scholarBlue dark:bg-neon text-white dark:text-black border-transparent'
                                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-transparent hover:border-scholarBlue dark:hover:border-neon'
                              }`}
                            >{c}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white mb-4 border-b dark:border-neon/20 pb-2 inline-block">Abstract</h4>
                      <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed font-medium">
                        {decodeAbstract(selectedNode.details.abstract)}
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-neon/10">
                      <button
                        onClick={() => toggleHighlight(selectedNode.id)}
                        className={`px-4 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                          highlightedNodes.has(selectedNode.id)
                            ? 'bg-scholarBlue dark:bg-neon text-white dark:text-black border-transparent'
                            : 'border-slate-200 dark:border-neon/30 text-slate-500 dark:text-neon hover:border-scholarBlue dark:hover:border-neon'
                        }`}
                      >
                        {highlightedNodes.has(selectedNode.id) ? '★ Lit' : '☆ Highlight'}
                      </button>
                      <button
                        onClick={() => {
                          const url = selectedNode.id.startsWith('http')
                            ? selectedNode.id
                            : `https://openalex.org/${selectedNode.id}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex-1 py-4 bg-slate-900 text-white dark:bg-neon dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={16} /> OpenAlex
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-300 dark:text-zinc-800 text-center font-bold italic">
                    Select a node to view metadata
                  </div>
                )}
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
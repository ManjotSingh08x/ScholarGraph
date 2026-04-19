// import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
// import {
//   Home, Search, ChevronRight, BookOpen, Loader2, Quote,
//   Sun, Moon, ExternalLink, X, Filter, Clock, Zap, Tag,
// } from 'lucide-react';
// import CitationGraph from './components/CitationGraph';
// import { PaperNode, CitationGraphData, ConceptSuggestion } from './types/types';

// // ─── helpers ────────────────────────────────────────────────────────────────

// const decodeAbstract = (idx: any): string => {
//   if (!idx) return 'No abstract available.';
//   const words: string[] = [];
//   try {
//     Object.entries(idx).forEach(([w, pos]) =>
//       (pos as number[]).forEach(p => (words[p] = w))
//     );
//     return words.join(' ');
//   } catch {
//     return 'Abstract currently unavailable.';
//   }
// };

// // B: build concept-facet counts from all nodes in the current graph
// const buildConceptFacets = (nodes: PaperNode[]): { label: string; count: number }[] => {
//   const freq: Record<string, number> = {};
//   nodes.forEach(n => {
//     (n.details.concepts ?? []).forEach(c => {
//       freq[c] = (freq[c] ?? 0) + 1;
//     });
//   });
//   return Object.entries(freq)
//     .map(([label, count]) => ({ label, count }))
//     .sort((a, b) => b.count - a.count)
//     .slice(0, 25);
// };

// // D: degree-centrality map  { nodeId → degree }
// const buildDegreeMap = (nodes: PaperNode[], links: CitationGraphData['links']): Record<string, number> => {
//   const deg: Record<string, number> = {};
//   nodes.forEach(n => (deg[n.id] = 0));
//   links.forEach(l => {
//     const s = typeof l.source === 'object' ? l.source.id : l.source;
//     const t = typeof l.target === 'object' ? l.target.id : l.target;
//     deg[s] = (deg[s] ?? 0) + 1;
//     deg[t] = (deg[t] ?? 0) + 1;
//   });
//   return deg;
// };

// // ─── Component ───────────────────────────────────────────────────────────────

// const App: React.FC = () => {
//   const [darkMode, setDarkMode] = useState(true);
//   const [view, setView] = useState<'home' | 'search' | 'graph'>('home');

//   // ── A: pre-search filters ──────────────────────────────────────────────────
//   const [searchQuery,        setSearchQuery]        = useState('');
//   const [startYear,          setStartYear]          = useState('');
//   const [endYear,            setEndYear]            = useState('');
//   const [venue,              setVenue]              = useState('');
//   const [selectedConcepts,   setSelectedConcepts]   = useState<ConceptSuggestion[]>([]);
//   const [conceptQuery,       setConceptQuery]       = useState('');
//   const [conceptSuggestions, setConceptSuggestions] = useState<ConceptSuggestion[]>([]);
//   const [conceptLoading,     setConceptLoading]     = useState(false);
//   const conceptDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

//   // ── data ───────────────────────────────────────────────────────────────────
//   const [searchResults, setSearchResults] = useState<any[]>([]);
//   const [graphData,     setGraphData]     = useState<CitationGraphData | null>(null);
//   const [selectedNode,  setSelectedNode]  = useState<PaperNode | null>(null);
//   const [loading,       setLoading]       = useState(false);

//   // ── B: faceted concept filter (post-search) ────────────────────────────────
//   const [activeFacets, setActiveFacets] = useState<Set<string>>(new Set());

//   // ── C: timeline slider ────────────────────────────────────────────────────
//   const [timelineYear, setTimelineYear] = useState<number | null>(null);
//   const yearRange = useMemo<[number, number] | null>(() => {
//     if (!graphData) return null;
//     const years = graphData.nodes
//       .map(n => n.details.publication_year)
//       .filter((y): y is number => typeof y === 'number');
//     if (!years.length) return null;
//     return [Math.min(...years), Math.max(...years)];
//   }, [graphData]);

//   useEffect(() => {
//     if (yearRange) setTimelineYear(yearRange[1]);
//   }, [yearRange]);

//   // ── D: topology filters ────────────────────────────────────────────────────
//   const [degreeThreshold,  setDegreeThreshold]  = useState(0);
//   const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

//   const degreeMap = useMemo(
//     () => (graphData ? buildDegreeMap(graphData.nodes, graphData.links) : {}),
//     [graphData]
//   );
//   const maxDegree = useMemo(
//     () => Math.max(0, ...Object.values(degreeMap)),
//     [degreeMap]
//   );

//   // ── Derived: concept facets ────────────────────────────────────────────────
//   const conceptFacets = useMemo(
//     () => (graphData ? buildConceptFacets(graphData.nodes) : []),
//     [graphData]
//   );

//   // ── Derived: visible node IDs (null = all visible) ────────────────────────
//   const visibleNodeIds = useMemo<Set<string> | null>(() => {
//     if (!graphData) return null;
//     const hasTimeline = timelineYear !== null && yearRange !== null && timelineYear < yearRange[1];
//     const hasFacets   = activeFacets.size > 0;
//     const hasDegree   = degreeThreshold > 0;
//     if (!hasTimeline && !hasFacets && !hasDegree) return null;

//     const ids = new Set<string>();
//     graphData.nodes.forEach(n => {
//       if (hasTimeline) {
//         const y = n.details.publication_year;
//         if (y === undefined || y === null || y > timelineYear!) return;
//       }
//       if (hasFacets) {
//         const nodeConcepts = new Set(n.details.concepts ?? []);
//         if (![...activeFacets].some(f => nodeConcepts.has(f))) return;
//       }
//       if (hasDegree && (degreeMap[n.id] ?? 0) < degreeThreshold) return;
//       ids.add(n.id);
//     });
//     return ids;
//   }, [graphData, timelineYear, yearRange, activeFacets, degreeThreshold, degreeMap]);

//   // ── A: concept autocomplete ────────────────────────────────────────────────
//   useEffect(() => {
//     if (conceptDebounce.current) clearTimeout(conceptDebounce.current);
//     if (!conceptQuery.trim()) { setConceptSuggestions([]); return; }
//     conceptDebounce.current = setTimeout(async () => {
//       setConceptLoading(true);
//       try {
//         const res  = await fetch(`http://localhost:5001/api/concepts?q=${encodeURIComponent(conceptQuery)}`);
//         const data = await res.json();
//         setConceptSuggestions(Array.isArray(data) ? data : []);
//       } catch { setConceptSuggestions([]); }
//       finally  { setConceptLoading(false); }
//     }, 300);
//   }, [conceptQuery]);

//   // ── Actions ────────────────────────────────────────────────────────────────
//   const performSearch = useCallback(async () => {
//     if (!searchQuery.trim()) return;
//     setLoading(true); setView('search');
//     try {
//       let url = `http://localhost:5001/api/search?q=${encodeURIComponent(searchQuery)}`;
//       if (startYear) url += `&start_year=${startYear}`;
//       if (endYear)   url += `&end_year=${endYear}`;
//       if (venue)     url += `&venue=${encodeURIComponent(venue)}`;
//       if (selectedConcepts.length)
//         url += `&concepts=${selectedConcepts.map(c => c.id).join(',')}`;
//       const res  = await fetch(url);
//       const data = await res.json();
//       setSearchResults(data.results ?? []);
//     } finally { setLoading(false); }
//   }, [searchQuery, startYear, endYear, venue, selectedConcepts]);

//   const generateGraph = useCallback(async (id: string) => {
//     setLoading(true);
//     try {
//       const res  = await fetch(`http://localhost:5001/api/graph/${id}`);
//       const data = await res.json();
//       setGraphData(data);
//       setSelectedNode(data.nodes.find((n: any) => n.group === 0) ?? data.nodes[0]);
//       setView('graph');
//       setActiveFacets(new Set());
//       setHighlightedNodes(new Set());
//       setDegreeThreshold(0);
//     } finally { setLoading(false); }
//   }, []);

//   const toggleFacet = (label: string) =>
//     setActiveFacets(prev => {
//       const next = new Set(prev);
//       next.has(label) ? next.delete(label) : next.add(label);
//       return next;
//     });

//   const toggleHighlight = (id: string) =>
//     setHighlightedNodes(prev => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });

//   const resetAllFilters = () => {
//     setActiveFacets(new Set());
//     setDegreeThreshold(0);
//     setHighlightedNodes(new Set());
//     if (yearRange) setTimelineYear(yearRange[1]);
//   };

//   const getRelations = (type: 'references' | 'cited_by') => {
//     if (!graphData || !selectedNode) return [];
//     return graphData.links
//       .filter(l => {
//         const s = typeof l.source === 'object' ? l.source.id : l.source;
//         const t = typeof l.target === 'object' ? l.target.id : l.target;
//         return type === 'references'
//           ? s === selectedNode.id && l.type === 'references'
//           : t === selectedNode.id && l.type === 'cited_by';
//       })
//       .map(l => {
//         const nId =
//           type === 'references'
//             ? typeof l.target === 'object' ? l.target.id : l.target
//             : typeof l.source === 'object' ? l.source.id : l.source;
//         return graphData.nodes.find(n => n.id === nId);
//       })
//       .filter(Boolean);
//   };

//   const anyPostFilter = visibleNodeIds !== null || degreeThreshold > 0 || highlightedNodes.size > 0;

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div className={darkMode ? 'dark' : ''}>
//       <div className="flex flex-col h-screen w-screen transition-colors duration-500 bg-white text-slate-900 dark:bg-black dark:text-white font-sans overflow-hidden">

//         {/* ════ HEADER ════ */}
//         <header className="flex items-start px-6 py-4 bg-white border-b border-slate-100 dark:bg-black dark:border-neon/20 z-50 gap-3 flex-wrap">
//           <button
//             onClick={() => setView('home')}
//             className="p-3 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-2xl shadow-lg transition-transform hover:scale-105 shrink-0 mt-0.5"
//           >
//             <Home size={22} />
//           </button>

//           <div className="flex flex-1 flex-col gap-2 min-w-0">
//             {/* Row 1: main search + year + venue */}
//             <div className="flex gap-2 flex-wrap">
//               <div className="relative flex-1 min-w-[180px]">
//                 <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-neon/40 pointer-events-none" size={17} />
//                 <input
//                   className="w-full pl-11 pr-4 py-3 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-3xl outline-none text-sm font-semibold transition-all dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
//                   placeholder="Search research papers…"
//                   value={searchQuery}
//                   onChange={e => setSearchQuery(e.target.value)}
//                   onKeyDown={e => e.key === 'Enter' && performSearch()}
//                 />
//               </div>
//               <input type="number" placeholder="From yr" value={startYear}
//                 onChange={e => setStartYear(e.target.value)}
//                 className="w-24 px-3 py-3 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-3xl outline-none text-sm dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
//               />
//               <input type="number" placeholder="To yr" value={endYear}
//                 onChange={e => setEndYear(e.target.value)}
//                 className="w-24 px-3 py-3 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-3xl outline-none text-sm dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
//               />
//               <input type="text" placeholder="Venue / Journal" value={venue}
//                 onChange={e => setVenue(e.target.value)}
//                 onKeyDown={e => e.key === 'Enter' && performSearch()}
//                 className="w-44 px-3 py-3 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-3xl outline-none text-sm dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
//               />
//               <button onClick={() => setDarkMode(!darkMode)}
//                 className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-neon font-black text-[10px] uppercase tracking-widest border border-transparent dark:border-neon/30 transition-all active:scale-95 shadow-sm shrink-0"
//               >
//                 {darkMode ? <><Sun size={15} /> Light</> : <><Moon size={15} /> Neon</>}
//               </button>
//             </div>

//             {/* Row 2: concept autocomplete ── A ── */}
//             <div className="flex items-center gap-2 flex-wrap">
//               <div className="relative">
//                 <input type="text" placeholder="+ Add concept filter…"
//                   value={conceptQuery}
//                   onChange={e => setConceptQuery(e.target.value)}
//                   className="w-56 px-4 py-2 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-2xl outline-none text-xs font-semibold dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
//                 />
//                 {(conceptSuggestions.length > 0 || conceptLoading) && (
//                   <div className="absolute top-full mt-1 left-0 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-neon/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
//                     {conceptLoading
//                       ? <div className="p-3 text-xs text-slate-400">Searching…</div>
//                       : conceptSuggestions.map(c => (
//                           <button key={c.id}
//                             onClick={() => {
//                               if (!selectedConcepts.find(s => s.id === c.id))
//                                 setSelectedConcepts(prev => [...prev, c]);
//                               setConceptQuery(''); setConceptSuggestions([]);
//                             }}
//                             className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors border-b border-slate-50 dark:border-zinc-800 last:border-0"
//                           >
//                             <div className="text-xs font-bold text-slate-800 dark:text-white">{c.display_name}</div>
//                             <div className="text-[10px] text-slate-400 dark:text-zinc-500">
//                               Level {c.level} · {c.works_count.toLocaleString()} works
//                               {c.description ? ` · ${c.description.slice(0, 60)}…` : ''}
//                             </div>
//                           </button>
//                         ))
//                     }
//                   </div>
//                 )}
//               </div>

//               {selectedConcepts.map(c => (
//                 <span key={c.id}
//                   className="flex items-center gap-1.5 px-3 py-1.5 bg-scholarBlue/10 dark:bg-neon/10 text-scholarBlue dark:text-neon rounded-full text-[10px] font-black uppercase tracking-wider"
//                 >
//                   {c.display_name}
//                   <button onClick={() => setSelectedConcepts(prev => prev.filter(s => s.id !== c.id))}>
//                     <X size={10} />
//                   </button>
//                 </span>
//               ))}

//               <button onClick={performSearch}
//                 className="ml-auto px-5 py-2 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
//               >
//                 Search
//               </button>
//             </div>
//           </div>
//         </header>

//         <main className="flex-1 flex overflow-hidden">

//           {/* ════ HOME ════ */}
//           {view === 'home' && (
//             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-1000">
//               <div className="bg-slate-900 dark:bg-neon p-8 rounded-[3rem] shadow-2xl text-white dark:text-black mb-10">
//                 <BookOpen size={64} />
//               </div>
//               <h1 className="text-8xl font-black tracking-tighter mb-8 italic">
//                 Scholar<span className="text-scholarBlue dark:text-neon">Graph.</span>
//               </h1>
//               <div className="max-w-2xl bg-slate-50 dark:bg-zinc-900/40 p-10 rounded-[2.5rem] border border-slate-200 dark:border-neon/20 backdrop-blur-xl shadow-xl">
//                 <Quote className="text-scholarBlue dark:text-neon mb-6 mx-auto opacity-40" size={32} />
//                 <p className="text-slate-600 dark:text-white text-xl font-medium italic leading-relaxed mb-6">
//                   "Knowledge shouldn't be trapped in static lists. I built ScholarGraph to turn thousands of citations into a living, breathing map of human progress."
//                 </p>
//                 <div className="flex items-center justify-center gap-4">
//                   <div className="h-[1px] w-12 bg-slate-200 dark:bg-zinc-800" />
//                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-neon/60">The Founder's Vision</span>
//                   <div className="h-[1px] w-12 bg-slate-200 dark:bg-zinc-800" />
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* ════ SEARCH RESULTS ════ */}
//           {view === 'search' && (
//             <div className="flex-1 overflow-y-auto p-16 max-w-5xl mx-auto w-full animate-in slide-in-from-bottom-8">
//               <div className="flex items-end gap-4 mb-10 flex-wrap">
//                 <h2 className="text-4xl font-black dark:text-neon">Results</h2>
//                 {[
//                   startYear && `From ${startYear}`,
//                   endYear && `To ${endYear}`,
//                   venue,
//                   ...selectedConcepts.map(c => c.display_name),
//                 ].filter(Boolean).map((label, i) => (
//                   <span key={i} className="px-3 py-1 bg-scholarBlue/10 dark:bg-neon/10 text-scholarBlue dark:text-neon rounded-full text-[10px] font-black uppercase tracking-widest">
//                     {label}
//                   </span>
//                 ))}
//               </div>

//               {loading
//                 ? <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-scholarBlue dark:text-neon" size={48} /></div>
//                 : searchResults.length === 0
//                   ? <div className="text-center text-slate-400 dark:text-zinc-600 font-bold italic pt-20">No results found.</div>
//                   : (
//                     <div className="grid gap-4">
//                       {searchResults.map(p => (
//                         <div key={p.id}
//                           onClick={() => generateGraph(p.id.split('/').pop())}
//                           className="p-8 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-neon/10 rounded-[2.5rem] hover:border-scholarBlue dark:hover:border-neon hover:shadow-2xl transition-all cursor-pointer flex justify-between items-center group"
//                         >
//                           <div className="flex-1 pr-10">
//                             <h3 className="text-xl font-bold group-hover:text-scholarBlue dark:group-hover:text-neon transition-colors mb-2 leading-tight">{p.title}</h3>
//                             <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
//                               {p.publication_year} · {p.cited_by_count?.toLocaleString()} citations
//                               {p.primary_location?.source?.display_name ? ` · ${p.primary_location.source.display_name}` : ''}
//                             </div>
//                           </div>
//                           <ChevronRight className="text-slate-200 dark:text-neon" size={32} />
//                         </div>
//                       ))}
//                     </div>
//                   )
//               }
//             </div>
//           )}

//           {/* ════ GRAPH VIEW ════ */}
//           {view === 'graph' && (
//             <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500">

//               {/* ── LEFT SIDEBAR ── */}
//               <aside className="w-72 bg-white border-r border-slate-100 dark:bg-black dark:border-neon/10 flex flex-col overflow-hidden">
//                 <div className="flex-1 overflow-y-auto p-5 space-y-7">

//                   {/* ── B: Concept Facets ── */}
//                   {conceptFacets.length > 0 && (
//                     <section>
//                       <div className="flex items-center justify-between mb-3">
//                         <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5">
//                           <Tag size={10} /> Concepts
//                         </h4>
//                         {activeFacets.size > 0 && (
//                           <button onClick={() => setActiveFacets(new Set())}
//                             className="text-[9px] font-black uppercase text-red-400 hover:text-red-500 transition-colors">
//                             Clear
//                           </button>
//                         )}
//                       </div>
//                       <div className="space-y-1">
//                         {conceptFacets.map(f => (
//                           <button key={f.label} onClick={() => toggleFacet(f.label)}
//                             className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
//                               activeFacets.has(f.label)
//                                 ? 'bg-scholarBlue dark:bg-neon text-white dark:text-black'
//                                 : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
//                             }`}
//                           >
//                             <span className="truncate pr-2">{f.label}</span>
//                             <span className={`text-[9px] font-black shrink-0 ${activeFacets.has(f.label) ? 'text-white/70 dark:text-black/60' : 'text-slate-300 dark:text-zinc-600'}`}>
//                               {f.count}
//                             </span>
//                           </button>
//                         ))}
//                       </div>
//                     </section>
//                   )}

//                   {/* ── D: Degree Centrality ── */}
//                   {graphData && maxDegree > 0 && (
//                     <section>
//                       <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5 mb-3">
//                         <Zap size={10} /> Impact Threshold
//                       </h4>
//                       <input type="range" min={0} max={maxDegree}
//                         value={degreeThreshold}
//                         onChange={e => setDegreeThreshold(Number(e.target.value))}
//                         className="w-full accent-scholarBlue dark:accent-neon"
//                       />
//                       <div className="flex justify-between mt-1 text-[9px] font-black uppercase text-slate-400 dark:text-zinc-600">
//                         <span>All</span>
//                         <span className="text-scholarBlue dark:text-neon">Min deg: {degreeThreshold}</span>
//                         <span>{maxDegree}</span>
//                       </div>
//                     </section>
//                   )}

//                   {/* Relations */}
//                   <section>
//                     <h4 className="text-[10px] font-black uppercase mb-3 text-slate-400 dark:text-neon/30 tracking-widest">References</h4>
//                     <div className="space-y-2">
//                       {getRelations('references').map((n, i) => (
//                         <button key={i} onClick={() => setSelectedNode(n!)}
//                           className="w-full text-left text-[11px] p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all font-bold text-slate-500 dark:text-zinc-400 border border-transparent line-clamp-2 italic">
//                           {n!.title}
//                         </button>
//                       ))}
//                     </div>
//                   </section>
//                   <section>
//                     <h4 className="text-[10px] font-black uppercase mb-3 text-slate-400 dark:text-neon/30 tracking-widest">Citations</h4>
//                     <div className="space-y-2">
//                       {getRelations('cited_by').map((n, i) => (
//                         <button key={i} onClick={() => setSelectedNode(n!)}
//                           className="w-full text-left text-[11px] p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all font-bold text-slate-500 dark:text-zinc-400 border border-transparent line-clamp-2 italic">
//                           {n!.title}
//                         </button>
//                       ))}
//                     </div>
//                   </section>
//                 </div>

//                 {/* ── C: Timeline slider (pinned to bottom) ── */}
//                 {yearRange && (
//                   <div className="border-t border-slate-100 dark:border-neon/10 p-5 shrink-0 bg-white dark:bg-black">
//                     <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5 mb-3">
//                       <Clock size={10} /> Timeline
//                     </h4>
//                     <input type="range" min={yearRange[0]} max={yearRange[1]}
//                       value={timelineYear ?? yearRange[1]}
//                       onChange={e => setTimelineYear(Number(e.target.value))}
//                       className="w-full accent-scholarBlue dark:accent-neon"
//                     />
//                     <div className="flex justify-between mt-1 text-[9px] font-black uppercase text-slate-400 dark:text-zinc-600">
//                       <span>{yearRange[0]}</span>
//                       <span className="text-scholarBlue dark:text-neon">≤ {timelineYear ?? yearRange[1]}</span>
//                       <span>{yearRange[1]}</span>
//                     </div>
//                     {timelineYear !== null && timelineYear < yearRange[1] && (
//                       <button onClick={() => setTimelineYear(yearRange[1])}
//                         className="mt-2 w-full text-[9px] font-black uppercase text-slate-400 hover:text-scholarBlue dark:hover:text-neon transition-colors text-center">
//                         Reset to latest
//                       </button>
//                     )}
//                   </div>
//                 )}
//               </aside>

//               {/* ── GRAPH CANVAS ── */}
//               <section className="flex-1 relative bg-slate-50 dark:bg-black overflow-hidden shadow-inner">
//                 {/* Active-filter pill */}
//                 {anyPostFilter && (
//                   <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-neon/20 rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest select-none">
//                     <Filter size={11} className="text-scholarBlue dark:text-neon" />
//                     <span className="text-slate-500 dark:text-zinc-400">
//                       {visibleNodeIds ? `${visibleNodeIds.size} / ${graphData?.nodes.length} nodes` : 'All nodes'}
//                     </span>
//                     {highlightedNodes.size > 0 && (
//                       <span className="text-scholarBlue dark:text-neon">{highlightedNodes.size} highlighted</span>
//                     )}
//                     <button onClick={resetAllFilters} className="text-red-400 hover:text-red-500 transition-colors ml-1">
//                       <X size={11} />
//                     </button>
//                   </div>
//                 )}

//                 {graphData && (
//                   <CitationGraph
//                     data={graphData}
//                     onNodeClick={setSelectedNode}
//                     onNodeCtrlClick={node => toggleHighlight(node.id)}
//                     selectedId={selectedNode?.id}
//                     isDark={darkMode}
//                     visibleNodeIds={visibleNodeIds}
//                     highlightedNodeIds={highlightedNodes}
//                     degreeMap={degreeMap}
//                   />
//                 )}

//                 {loading && (
//                   <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
//                     <Loader2 className="animate-spin text-scholarBlue dark:text-neon" size={48} />
//                   </div>
//                 )}

//                 <div className="absolute bottom-4 right-4 text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-zinc-700 select-none">
//                   Ctrl+click node to highlight path
//                 </div>
//               </section>

//               {/* ── RIGHT SIDEBAR ── */}
//               <aside className="w-[28rem] bg-white border-l border-slate-100 dark:bg-black dark:border-neon/10 p-10 overflow-y-auto shadow-2xl z-20">
//                 {selectedNode ? (
//                   <div className="space-y-7 animate-in slide-in-from-right">
//                     <div>
//                       <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-3 tracking-tight uppercase">
//                         {selectedNode.title}
//                       </h2>
//                       <p className="text-xs font-bold text-blue-600 dark:text-neon mb-1">
//                         {selectedNode.details.authors?.join(', ')}
//                       </p>
//                       <p className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em] leading-relaxed">
//                         {selectedNode.details.publication_year}
//                         {selectedNode.details.venue && selectedNode.details.venue !== 'Unknown Venue' && (
//                           <> · <span className="text-scholarBlue dark:text-neon/80">{selectedNode.details.venue}</span></>
//                         )}
//                       </p>
//                     </div>

//                     <div className="grid grid-cols-2 gap-3">
//                       {[
//                         { label: 'FWCI',      value: selectedNode.details.fwci?.toFixed(2) ?? '—', accent: true },
//                         { label: 'Citations', value: selectedNode.details.citation_count?.toLocaleString() ?? '—', accent: false },
//                         { label: 'Degree',    value: String(degreeMap[selectedNode.id] ?? 0), accent: false },
//                         { label: 'Level',     value: `L${selectedNode.group}`, accent: false },
//                       ].map(({ label, value, accent }) => (
//                         <div key={label} className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-3xl border border-slate-100 dark:border-neon/10">
//                           <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase mb-1">{label}</span>
//                           <span className={`text-xl font-black ${accent ? 'text-blue-600 dark:text-neon' : 'text-slate-900 dark:text-white'}`}>
//                             {value}
//                           </span>
//                         </div>
//                       ))}
//                     </div>

//                     {/* B: concept tags — clicking one adds to facet filter */}
//                     {(selectedNode.details.concepts ?? []).length > 0 && (
//                       <div>
//                         <h4 className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 mb-2 tracking-widest">Concepts</h4>
//                         <div className="flex flex-wrap gap-1.5">
//                           {(selectedNode.details.concepts ?? []).map(c => (
//                             <button key={c} onClick={() => toggleFacet(c)}
//                               className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
//                                 activeFacets.has(c)
//                                   ? 'bg-scholarBlue dark:bg-neon text-white dark:text-black border-transparent'
//                                   : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-transparent hover:border-scholarBlue dark:hover:border-neon'
//                               }`}
//                             >{c}</button>
//                           ))}
//                         </div>
//                       </div>
//                     )}

//                     <div>
//                       <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white mb-4 border-b dark:border-neon/20 pb-2 inline-block">Abstract</h4>
//                       <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed font-medium">
//                         {decodeAbstract(selectedNode.details.abstract)}
//                       </p>
//                     </div>

//                     <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-neon/10">
//                       {/* D: highlight toggle button */}
//                       <button
//                         onClick={() => toggleHighlight(selectedNode.id)}
//                         className={`px-4 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
//                           highlightedNodes.has(selectedNode.id)
//                             ? 'bg-scholarBlue dark:bg-neon text-white dark:text-black border-transparent'
//                             : 'border-slate-200 dark:border-neon/30 text-slate-500 dark:text-neon hover:border-scholarBlue dark:hover:border-neon'
//                         }`}
//                       >
//                         {highlightedNodes.has(selectedNode.id) ? '★ Lit' : '☆ Highlight'}
//                       </button>
//                       <button
//                         onClick={() => {
//                           const url = selectedNode.id.startsWith('http')
//                             ? selectedNode.id
//                             : `https://openalex.org/${selectedNode.id}`;
//                           window.open(url, '_blank', 'noopener,noreferrer');
//                         }}
//                         className="flex-1 py-4 bg-slate-900 text-white dark:bg-neon dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
//                       >
//                         <ExternalLink size={16} /> OpenAlex
//                       </button>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="h-full flex items-center justify-center text-slate-300 dark:text-zinc-800 text-center font-bold italic">
//                     Select a node to view metadata
//                   </div>
//                 )}
//               </aside>
//             </div>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// };

// export default App;

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Home, Search, ChevronRight, BookOpen, Loader2, Quote,
  Sun, Moon, ExternalLink, X, Filter, Clock, Zap, Tag,
} from 'lucide-react';
import CitationGraph from './components/CitationGraph';
import { PaperNode, CitationGraphData, ConceptSuggestion } from './types/types';

// ─── helpers ────────────────────────────────────────────────────────────────

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

// B: build concept-facet counts from all nodes in the current graph
const buildConceptFacets = (nodes: PaperNode[]): { label: string; count: number }[] => {
  const freq: Record<string, number> = {};
  nodes.forEach(n => {
    (n.details.concepts ?? []).forEach(c => {
      freq[c] = (freq[c] ?? 0) + 1;
    });
  });
  return Object.entries(freq)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
};

// D: degree-centrality map  { nodeId → degree }
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

// ─── Component ───────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState<'home' | 'search' | 'graph'>('home');

  // ── A: pre-search filters ──────────────────────────────────────────────────
  const [searchQuery,        setSearchQuery]        = useState('');
  const [startYear,          setStartYear]          = useState('');
  const [endYear,            setEndYear]            = useState('');
  const [venue,              setVenue]              = useState('');
  const [selectedConcepts,   setSelectedConcepts]   = useState<ConceptSuggestion[]>([]);
  const [conceptQuery,       setConceptQuery]       = useState('');
  const [conceptSuggestions, setConceptSuggestions] = useState<ConceptSuggestion[]>([]);
  const [conceptLoading,     setConceptLoading]     = useState(false);
  const conceptDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New State for Collapsible Filter Panel
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // ── data ───────────────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [graphData,     setGraphData]     = useState<CitationGraphData | null>(null);
  const [selectedNode,  setSelectedNode]  = useState<PaperNode | null>(null);
  const [loading,       setLoading]       = useState(false);

  // ── B: faceted concept filter (post-search) ────────────────────────────────
  const [activeFacets, setActiveFacets] = useState<Set<string>>(new Set());

  // ── C: timeline slider ────────────────────────────────────────────────────
  const [timelineYear, setTimelineYear] = useState<number | null>(null);
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

  // ── D: topology filters ────────────────────────────────────────────────────
  const [degreeThreshold,  setDegreeThreshold]  = useState(0);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

  const degreeMap = useMemo(
    () => (graphData ? buildDegreeMap(graphData.nodes, graphData.links) : {}),
    [graphData]
  );
  const maxDegree = useMemo(
    () => Math.max(0, ...Object.values(degreeMap)),
    [degreeMap]
  );

  // ── Derived: concept facets ────────────────────────────────────────────────
  const conceptFacets = useMemo(
    () => (graphData ? buildConceptFacets(graphData.nodes) : []),
    [graphData]
  );

  // ── Derived: visible node IDs (null = all visible) ────────────────────────
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
        const nodeConcepts = new Set(n.details.concepts ?? []);
        if (![...activeFacets].some(f => nodeConcepts.has(f))) return;
      }
      if (hasDegree && (degreeMap[n.id] ?? 0) < degreeThreshold) return;
      ids.add(n.id);
    });
    return ids;
  }, [graphData, timelineYear, yearRange, activeFacets, degreeThreshold, degreeMap]);

  // ── A: concept autocomplete ────────────────────────────────────────────────
  useEffect(() => {
    if (conceptDebounce.current) clearTimeout(conceptDebounce.current);
    if (!conceptQuery.trim()) { setConceptSuggestions([]); return; }
    conceptDebounce.current = setTimeout(async () => {
      setConceptLoading(true);
      try {
        const res  = await fetch(`http://localhost:5001/api/concepts?q=${encodeURIComponent(conceptQuery)}`);
        const data = await res.json();
        setConceptSuggestions(Array.isArray(data) ? data : []);
      } catch { setConceptSuggestions([]); }
      finally  { setConceptLoading(false); }
    }, 300);
  }, [conceptQuery]);

  // ── Actions ────────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen w-screen transition-colors duration-500 bg-white text-slate-900 dark:bg-black dark:text-white font-sans overflow-hidden">

        {/* ════ HEADER ════ */}
        <header className="flex items-start px-6 py-4 bg-white border-b border-slate-100 dark:bg-black dark:border-neon/20 z-50 gap-3 flex-wrap relative">
          <button
            onClick={() => setView('home')}
            className="p-3 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-2xl shadow-lg transition-transform hover:scale-105 shrink-0 mt-0.5"
          >
            <Home size={22} />
          </button>

          <div className="flex flex-1 flex-col min-w-0">
            {/* A. Minimal Default View (Top Bar) */}
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
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`px-5 py-3 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all border-2 flex items-center gap-2 ${
                  isFiltersOpen
                    ? 'bg-slate-200 border-slate-300 text-slate-800 dark:bg-zinc-800 dark:border-neon/40 dark:text-neon'
                    : 'bg-slate-100 border-transparent text-slate-600 hover:border-scholarBlue dark:bg-zinc-900 dark:text-white dark:hover:border-neon'
                }`}
              >
                ⚙️ Filters
              </button>

              <button onClick={performSearch}
                className="px-6 py-3 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-3xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                Search
              </button>

              <button onClick={() => setDarkMode(!darkMode)}
                className="flex items-center gap-2 px-5 py-3 rounded-3xl bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-neon font-black text-[10px] uppercase tracking-widest border border-transparent dark:border-neon/30 transition-all active:scale-95 shadow-sm shrink-0"
              >
                {darkMode ? <><Sun size={15} /> Light</> : <><Moon size={15} /> Neon</>}
              </button>
            </div>

            {/* B & C. Toggle Panel Behavior & Content */}
            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isFiltersOpen ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr] mt-0"}`}>
              <div className="overflow-hidden">
                <div className="flex flex-wrap gap-3 p-4 bg-slate-50 border border-slate-200 rounded-3xl dark:bg-zinc-900/40 dark:border-neon/10 items-center">
                  
                  <select 
                    value={startYear} 
                    onChange={e => setStartYear(e.target.value)}
                    className="w-36 px-4 py-2.5 bg-white border border-slate-200 focus:border-scholarBlue rounded-2xl outline-none text-xs font-semibold dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:border-neon"
                  >
                    <option value="">📅 Start Year</option>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={`start-${y}`} value={y}>{y}</option>
                    ))}
                  </select>

                  <select 
                    value={endYear} 
                    onChange={e => setEndYear(e.target.value)}
                    className="w-36 px-4 py-2.5 bg-white border border-slate-200 focus:border-scholarBlue rounded-2xl outline-none text-xs font-semibold dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:border-neon"
                  >
                    <option value="">📅 End Year</option>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={`end-${y}`} value={y}>{y}</option>
                    ))}
                  </select>

                  {/* Note: I converted Venue to a dropdown as requested, with a few common defaults. 
                      You can change this back to an <input type="text"> if you prefer free-form entry. */}
                  <select 
                    value={venue} 
                    onChange={e => setVenue(e.target.value)}
                    className="w-44 px-4 py-2.5 bg-white border border-slate-200 focus:border-scholarBlue rounded-2xl outline-none text-xs font-semibold dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:border-neon"
                  >
                    <option value="">🏛️ Venue</option>
                    <option value="ICLR">ICLR</option>
                    <option value="NeurIPS">NeurIPS</option>
                    <option value="ICML">ICML</option>
                    <option value="CVPR">CVPR</option>
                    <option value="Nature">Nature</option>
                    <option value="Science">Science</option>
                  </select>

                  <div className="w-[1px] h-8 bg-slate-200 dark:bg-zinc-800 mx-2" />

                  {/* Concept Search inside the Panel */}
                  <div className="relative flex-1 min-w-[200px]">
                    <input type="text" placeholder="+ Add concept filter…"
                      value={conceptQuery}
                      onChange={e => setConceptQuery(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-scholarBlue rounded-2xl outline-none text-xs font-semibold dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:focus:border-neon"
                    />
                    {(conceptSuggestions.length > 0 || conceptLoading) && (
                      <div className="absolute top-full mt-2 left-0 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-neon/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        {conceptLoading
                          ? <div className="p-3 text-xs text-slate-400">Searching…</div>
                          : conceptSuggestions.map(c => (
                              <button key={c.id}
                                onClick={() => {
                                  if (!selectedConcepts.find(s => s.id === c.id))
                                    setSelectedConcepts(prev => [...prev, c]);
                                  setConceptQuery(''); setConceptSuggestions([]);
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors border-b border-slate-50 dark:border-zinc-800 last:border-0"
                              >
                                <div className="text-xs font-bold text-slate-800 dark:text-white">{c.display_name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                                  Level {c.level} · {c.works_count.toLocaleString()} works
                                </div>
                              </button>
                            ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* D. Active Filter Feedback (Pills) */}
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

          {/* ════ HOME ════ */}
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

          {/* ════ SEARCH RESULTS ════ */}
          {view === 'search' && (
            <div className="flex-1 overflow-y-auto p-16 max-w-5xl mx-auto w-full animate-in slide-in-from-bottom-8">
              <div className="flex items-end gap-4 mb-10 flex-wrap">
                <h2 className="text-4xl font-black dark:text-neon">Results</h2>
              </div>

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

          {/* ════ GRAPH VIEW ════ */}
          {view === 'graph' && (
            <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500">

              {/* ── LEFT SIDEBAR ── */}
              <aside className="w-72 bg-white border-r border-slate-100 dark:bg-black dark:border-neon/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-7">

                  {/* ── B: Concept Facets ── */}
                  {conceptFacets.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5">
                          <Tag size={10} /> Concepts
                        </h4>
                        {activeFacets.size > 0 && (
                          <button onClick={() => setActiveFacets(new Set())}
                            className="text-[9px] font-black uppercase text-red-400 hover:text-red-500 transition-colors">
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

                  {/* ── D: Degree Centrality ── */}
                  {graphData && maxDegree > 0 && (
                    <section>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-neon/30 tracking-widest flex items-center gap-1.5 mb-3">
                        <Zap size={10} /> Impact Threshold
                      </h4>
                      <input type="range" min={0} max={maxDegree}
                        value={degreeThreshold}
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

                  {/* Relations */}
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

                {/* ── C: Timeline slider (pinned to bottom) ── */}
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

              {/* ── GRAPH CANVAS ── */}
              <section className="flex-1 relative bg-slate-50 dark:bg-black overflow-hidden shadow-inner">
                {/* Active-filter pill */}
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

              {/* ── RIGHT SIDEBAR ── */}
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

                    {/* B: concept tags — clicking one adds to facet filter */}
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
                      {/* D: highlight toggle button */}
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
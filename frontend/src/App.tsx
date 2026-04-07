import React, { useState } from 'react';
import { Home, Search, ChevronRight, BookOpen, Loader2, Quote, Sun, Moon, Info, ExternalLink } from 'lucide-react';
import CitationGraph from './components/CitationGraph';
import { PaperNode, CitationGraphData } from './types/types';

const decodeAbstract = (idx: any) => {
  if (!idx) return "No abstract available.";
  const words: string[] = [];
  try {
    Object.entries(idx).forEach(([w, pos]) => (pos as number[]).forEach(p => words[p] = w));
    return words.join(" ");
  } catch { return "Abstract currently unavailable."; }
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true); 
  const [view, setView] = useState<'home' | 'search' | 'graph'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<CitationGraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<PaperNode | null>(null);
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    if (!searchQuery) return;
    setLoading(true); setView('search');
    try {
      const res = await fetch(`http://localhost:5001/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } finally { setLoading(false); }
  };

  const generateGraph = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/graph/${id}`);
      const data = await res.json();
      setGraphData(data);
      setSelectedNode(data.nodes.find((n: any) => n.group === 0) || data.nodes[0]);
      setView('graph');
    } finally { setLoading(false); }
  };

  const getRelations = (type: 'references' | 'cited_by') => {
    if (!graphData || !selectedNode) return [];
    return graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return type === 'references' ? s === selectedNode.id && l.type === 'references' : t === selectedNode.id && l.type === 'cited_by';
    }).map(l => {
      const nId = type === 'references' ? (typeof l.target === 'object' ? l.target.id : l.target) : (typeof l.source === 'object' ? l.source.id : l.source);
      return graphData.nodes.find(n => n.id === nId);
    }).filter(Boolean);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen w-screen transition-colors duration-500 bg-white text-slate-900 dark:bg-black dark:text-white font-sans overflow-hidden">
        
        {/* HEADER */}
        <header className="flex items-center px-10 py-5 bg-white border-b border-slate-100 dark:bg-black dark:border-neon/20 z-50 gap-8">
          <button onClick={() => setView('home')} className="p-3 bg-scholarBlue dark:bg-neon text-white dark:text-black rounded-2xl shadow-lg transition-transform hover:scale-105">
            <Home size={22} />
          </button>
          
          <div className="flex-1 max-w-3xl relative">
            <Search className="absolute left-5 top-4 text-slate-400 dark:text-neon/40" size={20} />
            <input 
              className="w-full pl-14 pr-6 py-4 bg-slate-100 border-2 border-transparent focus:border-scholarBlue rounded-3xl outline-none text-sm font-semibold transition-all dark:bg-zinc-900 dark:text-white dark:focus:border-neon"
              placeholder="Search research paper..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && performSearch()} 
            />
          </div>

          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-neon font-black text-[10px] uppercase tracking-widest border border-transparent dark:border-neon/30 transition-all active:scale-95 shadow-sm"
          >
            {darkMode ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Neon Mode</>}
          </button>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {/* HOME VIEW */}
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

          {/* SEARCH RESULTS */}
          {view === 'search' && (
            <div className="flex-1 overflow-y-auto p-16 max-w-5xl mx-auto w-full animate-in slide-in-from-bottom-8">
              <h2 className="text-4xl font-black mb-12 dark:text-neon">Results</h2>
              <div className="grid gap-4">
                {searchResults.map(p => (
                  <div key={p.id} onClick={() => generateGraph(p.id.split('/').pop())}
                    className="p-8 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-neon/10 rounded-[2.5rem] hover:border-scholarBlue dark:hover:border-neon hover:shadow-2xl transition-all cursor-pointer flex justify-between items-center group">
                    <div className="flex-1 pr-10">
                      <h3 className="text-xl font-bold group-hover:text-scholarBlue dark:group-hover:text-neon transition-colors mb-2 leading-tight">{p.title}</h3>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        {p.publication_year} • {p.cited_by_count?.toLocaleString()} Citations
                      </div>
                    </div>
                    <ChevronRight className="text-slate-200 dark:text-neon" size={32} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRIPLE PANE GRAPH VIEW */}
          {view === 'graph' && (
            <div className="flex flex-1 overflow-hidden animate-in fade-in duration-500">
              
              <aside className="w-80 bg-white border-r border-slate-100 dark:bg-black dark:border-neon/10 flex flex-col p-6 space-y-10 overflow-y-auto">
                <section>
                  <h4 className="text-[10px] font-black uppercase mb-6 text-slate-400 dark:text-neon/30 tracking-widest">References</h4>
                  <div className="space-y-3">
                    {getRelations('references').map((n, i) => (
                      <button key={i} onClick={() => setSelectedNode(n!)} className="w-full text-left text-[11px] p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all font-bold text-slate-500 dark:text-zinc-400 border border-transparent line-clamp-2 italic">
                        {n!.title}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h4 className="text-[10px] font-black uppercase mb-6 text-slate-400 dark:text-neon/30 tracking-widest">Citations</h4>
                  <div className="space-y-3">
                    {getRelations('cited_by').map((n, i) => (
                      <button key={i} onClick={() => setSelectedNode(n!)} className="w-full text-left text-[11px] p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all font-bold text-slate-500 dark:text-zinc-400 border border-transparent line-clamp-2 italic">
                        {n!.title}
                      </button>
                    ))}
                  </div>
                </section>
              </aside>

              <section className="flex-1 relative bg-slate-50 dark:bg-black overflow-hidden shadow-inner">
                {graphData && <CitationGraph data={graphData} onNodeClick={setSelectedNode} selectedId={selectedNode?.id} isDark={darkMode} />}
                {loading && (
                  <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <Loader2 className="animate-spin text-scholarBlue dark:text-neon" size={48} />
                  </div>
                )}
              </section>

              {/* RIGHT SIDEBAR: DETAILS */}
              <aside className="w-[30rem] bg-white border-l border-slate-100 dark:bg-black dark:border-neon/10 p-12 overflow-y-auto shadow-2xl z-20">
                {selectedNode ? (
                  <div className="space-y-10 animate-in slide-in-from-right">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-6 tracking-tight uppercase">
                        {selectedNode.title}
                      </h2>
                      <p className="text-xs font-bold text-blue-600 dark:text-neon mb-2">
                        {selectedNode.details.authors.join(', ')}
                      </p>
                      <p className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-[0.2em]">
                        {selectedNode.details.publication_year}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50 dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-neon/10 shadow-sm">
                        <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase mb-2">Impact</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-neon">{selectedNode.details.fwci?.toFixed(2) || "1.00"}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-neon/10 shadow-sm">
                        <span className="block text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase mb-2">Citations</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{selectedNode.details.citation_count?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-white mb-6 border-b dark:border-neon/20 pb-2 inline-block">Abstract</h4>
                      <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed font-medium">
                        {decodeAbstract(selectedNode.details.abstract)}
                      </p>
                    </div>

                    <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-neon/10">
                      <button 
                        onClick={() => {
                          if (selectedNode?.id) {
                            // Ensure absolute URL to prevent opening as a local route
                            const targetUrl = selectedNode.id.startsWith('http') 
                              ? selectedNode.id 
                              : `https://openalex.org/${selectedNode.id}`;
                            window.open(targetUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="flex-1 py-5 bg-slate-900 text-white dark:bg-neon dark:text-black rounded-3xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200 dark:shadow-neon/20 flex items-center justify-center gap-3"
                      >
                        <ExternalLink size={20}/> VIEW ON OPEN ALEX
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
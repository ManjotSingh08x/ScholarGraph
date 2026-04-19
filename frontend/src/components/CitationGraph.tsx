import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PaperNode, GraphLink, CitationGraphData } from '../types/types';

interface Props {
  data: CitationGraphData;
  onNodeClick: (node: PaperNode) => void;
  onNodeCtrlClick?: (node: PaperNode) => void;   // D: ctrl+click for path highlight
  selectedId?: string;
  isDark?: boolean;
  // B/C/D: set of IDs that pass post-search filters (null = all pass)
  visibleNodeIds?: Set<string> | null;
  // D: nodes the user explicitly lit up → edges between them get highlighted
  highlightedNodeIds?: Set<string>;
  // D: degree map for node sizing hint
  degreeMap?: Record<string, number>;
}

const CitationGraph: React.FC<Props> = ({
  data,
  onNodeClick,
  onNodeCtrlClick,
  selectedId,
  isDark,
  visibleNodeIds,
  highlightedNodeIds = new Set(),
  degreeMap = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width  = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg    = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svg.append('g');

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', e => container.attr('transform', e.transform))
    );

    // ── Defs: glow + highlighted-edge marker ────────────────────────────────
    const defs = svg.append('defs');

    const glow = defs.append('filter').attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', isDark ? '5' : '3').attr('result', 'blur');
    glow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const hlGlow = defs.append('filter').attr('id', 'hl-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    hlGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
    hlGlow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // ── Helpers ─────────────────────────────────────────────────────────────
    const nodeId = (n: PaperNode | string) =>
      typeof n === 'object' ? n.id : n;

    const isVisible = (d: PaperNode) =>
      visibleNodeIds === null || visibleNodeIds === undefined || visibleNodeIds.has(d.id);

    const isHighlighted = (id: string) => highlightedNodeIds.has(id);

    // D: an edge is "lit" if both endpoints are in the highlighted set
    const isEdgeLit = (l: GraphLink) =>
      highlightedNodeIds.size >= 2 &&
      highlightedNodeIds.has(nodeId(l.source)) &&
      highlightedNodeIds.has(nodeId(l.target));

    // ── Simulation ───────────────────────────────────────────────────────────
    const simulation = d3.forceSimulation<PaperNode>(data.nodes)
      .force('link', d3.forceLink<PaperNode, GraphLink>(data.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-700))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(65));

    // ── Links ────────────────────────────────────────────────────────────────
    const linkSel = container.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(data.links)
      .join('line')
      .attr('stroke', l =>
        isEdgeLit(l)
          ? (isDark ? '#fff' : '#f59e0b')       // amber / white for lit edges
          : (isDark ? '#39FF14' : '#2563eb')
      )
      .attr('stroke-opacity', l => isEdgeLit(l) ? 0.95 : (isDark ? 0.15 : 0.25))
      .attr('stroke-width',   l => isEdgeLit(l) ? 3 : 1.5);

    // ── Drag ─────────────────────────────────────────────────────────────────
    const drag = d3.drag<SVGGElement, PaperNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    // ── Nodes ────────────────────────────────────────────────────────────────
    const nodeGroup = container.append('g')
      .selectAll<SVGGElement, PaperNode>('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        if (event.ctrlKey || event.metaKey) {
          onNodeCtrlClick?.(d);
        } else {
          onNodeClick(d);
        }
      })
      .call(drag as any);

    // Base radius: seed = 24, L1 = 16, L2 = 12; boost slightly by degree
    const baseRadius = (d: PaperNode) => {
      const base = d.group === 0 ? 24 : d.group === 1 ? 16 : 12;
      const deg  = degreeMap[d.id] ?? 0;
      return base + Math.min(deg * 0.4, 6);   // up to +6px for highly connected
    };

    // Node circle
    nodeGroup.append('circle')
      .attr('r', baseRadius)
      .attr('fill', d => {
        if (d.group === 0)            return isDark ? '#39FF14' : '#2563eb';
        if (isHighlighted(d.id))      return isDark ? '#fff'    : '#f59e0b';
        return isDark ? '#000' : '#fff';
      })
      .attr('stroke', d => {
        if (d.id === selectedId)   return isDark ? '#fff'    : '#2563eb';
        if (isHighlighted(d.id))   return isDark ? '#fff'    : '#f59e0b';
        return isDark ? '#39FF14' : '#e2e8f0';
      })
      .attr('stroke-width', d =>
        d.id === selectedId || isHighlighted(d.id) ? 4 : 2
      )
      .style('filter', d =>
        d.group === 0 ? 'url(#glow)' : isHighlighted(d.id) ? 'url(#hl-glow)' : 'none'
      )
      // B/C/D: dim nodes that don't pass post-search filters
      .style('opacity', d => isVisible(d) ? 1 : 0.08)
      .style('transition', 'opacity 0.3s ease-in-out, r 0.3s ease-in-out');

    // Label
    nodeGroup.append('text')
      .text(d => d.title.length > 25 ? d.title.substring(0, 22) + '…' : d.title)
      .attr('dy', d => baseRadius(d) + 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '900')
      .style('fill', d =>
        isHighlighted(d.id)
          ? (isDark ? '#fff' : '#f59e0b')
          : (isDark ? '#39FF14' : '#1e293b')
      )
      .style('pointer-events', 'none')
      .style('text-transform', 'uppercase')
      .style('opacity', d => isVisible(d) ? 1 : 0)
      .style('transition', 'opacity 0.3s ease-in-out');

    // ── Tick ─────────────────────────────────────────────────────────────────
    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);
      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [data, onNodeClick, onNodeCtrlClick, selectedId, isDark, visibleNodeIds, highlightedNodeIds, degreeMap]);

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default CitationGraph;
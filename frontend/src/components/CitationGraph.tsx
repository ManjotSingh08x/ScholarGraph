import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PaperNode, GraphLink, CitationGraphData } from '../types/types';

interface Props {
  data: CitationGraphData;
  onNodeClick: (node: PaperNode) => void;
  onNodeCtrlClick?: (node: PaperNode) => void;
  selectedId?: string;
  isDark?: boolean;
  visibleNodeIds?: Set<string> | null;
  highlightedNodeIds?: Set<string>;
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

  const callbacks = useRef({ onNodeClick, onNodeCtrlClick });
  useEffect(() => {
    callbacks.current = { onNodeClick, onNodeCtrlClick };
  }, [onNodeClick, onNodeCtrlClick]);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    
    // Clear out the SVG ONLY when new data arrives
    svg.selectAll('*').remove();

    const container = svg.append('g').attr('class', 'graph-container');

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', e => container.attr('transform', e.transform))
    );

    const defs = svg.append('defs');

    const glow = defs.append('filter').attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');

    glow.append('feGaussianBlur').attr('class', 'glow-blur').attr('stdDeviation', '4').attr('result', 'blur');
    glow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const hlGlow = defs.append('filter').attr('id', 'hl-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    hlGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
    hlGlow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const simulation = d3.forceSimulation<PaperNode>(data.nodes)
      .force('link', d3.forceLink<PaperNode, GraphLink>(data.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-700))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(65));

    const linkSel = container.append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(data.links)
      .join('line')
      .attr('class', 'graph-link'); 

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

    const nodeGroup = container.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, PaperNode>('g')
      .data(data.nodes)
      .join('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        if (event.ctrlKey || event.metaKey) {
          callbacks.current.onNodeCtrlClick?.(d);
        } else {
          callbacks.current.onNodeClick(d);
        }
      })
      .call(drag as any);

    const baseRadius = (d: PaperNode) => {
      const base = d.group === 0 ? 24 : d.group === 1 ? 16 : 12;
      const deg = degreeMap[d.id] ?? 0;
      return base + Math.min(deg * 0.4, 6);
    };

    nodeGroup.append('circle')
      .attr('class', 'node-circle') 
      .attr('r', baseRadius)
      .style('transition', 'opacity 0.3s ease-in-out, r 0.3s ease-in-out');

    nodeGroup.append('text')
      .attr('class', 'node-label')
      .text(d => d.title.length > 25 ? d.title.substring(0, 22) + '…' : d.title)
      .attr('dy', d => baseRadius(d) + 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '900')
      .style('pointer-events', 'none')
      .style('text-transform', 'uppercase')
      .style('transition', 'opacity 0.3s ease-in-out');

    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);
      nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [data, degreeMap]); 


  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const nodeId = (n: PaperNode | string) => (typeof n === 'object' ? n.id : n);
    const isVisible = (d: PaperNode) =>
      visibleNodeIds === null || visibleNodeIds === undefined || visibleNodeIds.has(d.id);
    const isHighlighted = (id: string) => highlightedNodeIds.has(id);
    const isEdgeLit = (l: GraphLink) =>
      highlightedNodeIds.size >= 2 &&
      highlightedNodeIds.has(nodeId(l.source)) &&
      highlightedNodeIds.has(nodeId(l.target));

    svg.select('.glow-blur').attr('stdDeviation', isDark ? '5' : '3');

    svg.selectAll<SVGLineElement, GraphLink>('.graph-link')
      .attr('stroke', l =>
        isEdgeLit(l) ? (isDark ? '#fff' : '#f59e0b') : (isDark ? '#39FF14' : '#2563eb')
      )
      .attr('stroke-opacity', l => (isEdgeLit(l) ? 0.95 : isDark ? 0.15 : 0.25))
      .attr('stroke-width', l => (isEdgeLit(l) ? 3 : 1.5));

    svg.selectAll<SVGCircleElement, PaperNode>('.node-circle')
      .attr('fill', d => {
        if (d.group === 0) return isDark ? '#39FF14' : '#2563eb';
        if (isHighlighted(d.id)) return isDark ? '#fff' : '#f59e0b';
        return isDark ? '#000' : '#fff';
      })
      .attr('stroke', d => {
        if (d.id === selectedId) return isDark ? '#fff' : '#2563eb';
        if (isHighlighted(d.id)) return isDark ? '#fff' : '#f59e0b';
        return isDark ? '#39FF14' : '#e2e8f0';
      })
      .attr('stroke-width', d => (d.id === selectedId || isHighlighted(d.id) ? 4 : 2))
      .style('filter', d =>
        d.group === 0 ? 'url(#glow)' : isHighlighted(d.id) ? 'url(#hl-glow)' : 'none'
      )
      .style('opacity', d => (isVisible(d) ? 1 : 0.08));

    svg.selectAll<SVGTextElement, PaperNode>('.node-label')
      .style('fill', d =>
        isHighlighted(d.id)
          ? isDark ? '#fff' : '#f59e0b'
          : isDark ? '#39FF14' : '#1e293b'
      )
      .style('opacity', d => (isVisible(d) ? 1 : 0));

  }, [selectedId, highlightedNodeIds, visibleNodeIds, isDark]); // Only UI state here

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default CitationGraph;
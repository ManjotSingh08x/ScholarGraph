import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PaperNode, GraphLink, CitationGraphData } from '../types/types';

interface Props {
  data: CitationGraphData;
  onNodeClick: (node: PaperNode) => void;
  selectedId?: string;
  isDark?: boolean;
}

const CitationGraph: React.FC<Props> = ({ data, onNodeClick, selectedId, isDark }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g");
    
    // Zoom behavior
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on("zoom", (e) => {
      container.attr("transform", e.transform);
    }));

    // Glow Filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", isDark ? "5" : "3").attr("result", "blur");
    filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    const simulation = d3.forceSimulation<PaperNode>(data.nodes)
      .force("link", d3.forceLink<PaperNode, GraphLink>(data.links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-700))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(65));

    const link = container.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", isDark ? "#39FF14" : "#2563eb")
      .attr("stroke-opacity", isDark ? 0.2 : 0.3)
      .attr("stroke-width", 1.5);

    const drag = d3.drag<SVGGElement, PaperNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    const nodeGroup = container.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_, d) => onNodeClick(d))
      .call(drag as any);

    nodeGroup.append("circle")
      .attr("r", d => d.group === 0 ? 24 : d.group === 1 ? 16 : 12)
      .attr("fill", d => d.group === 0 ? (isDark ? "#39FF14" : "#2563eb") : (isDark ? "#000" : "#fff"))
      .attr("stroke", d => d.id === selectedId ? (isDark ? "#fff" : "#2563eb") : (isDark ? "#39FF14" : "#e2e8f0"))
      .attr("stroke-width", d => d.id === selectedId ? 4 : 2)
      .style("filter", d => d.group === 0 ? "url(#glow)" : "none");

    nodeGroup.append("text")
      .text(d => d.title.length > 25 ? d.title.substring(0, 22) + "..." : d.title)
      .attr("dy", 45)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "900")
      .style("fill", isDark ? "#39FF14" : "#1e293b")
      .style("pointer-events", "none")
      .style("text-transform", "uppercase");

    simulation.on("tick", () => {
      link.attr("x1", d => (d.source as any).x).attr("y1", d => (d.source as any).y)
          .attr("x2", d => (d.target as any).x).attr("y2", d => (d.target as any).y);
      nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });
  }, [data, onNodeClick, selectedId, isDark]);

  return <div className="w-full h-full"><svg ref={svgRef} className="w-full h-full" /></div>;
};

export default CitationGraph;
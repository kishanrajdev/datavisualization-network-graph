const margin = {top: 40, left: 60};
const width = window.innerWidth * 0.8;
const height = window.innerHeight * 0.8;

const svg = d3.select(".d3-chart")
  .append("svg")
  .attr('width', width)
  .attr('height', height)
  .attr("viewBox", [-width / 2, -height / 2, width, height])
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const tooltip = d3.select("#tooltip");

Promise.all([d3.json("../data/Edge-Relation.json"), d3.json("../data/Nodes.json")]).then(([edgesData, nodesData]) => {
  const nodesMap = new Map();
  const movieSet = new Set();
  for (const node of nodesData) {
    nodesMap.set(node.id, node);
    movieSet.add(node.movie);
  }
  const interactions = Array.from(new Set(edgesData.map(d => d.interaction)));
  const nodes = Array.from(new Set(edgesData.flatMap(l => [l.source, l.target])), id => ({id}));
  const links = edgesData.map(d => Object.create(d));
  const linkColors = d3.scaleOrdinal(interactions, d3.schemeCategory10);
  const nodeColors = d3.scaleOrdinal(Array.from(movieSet), ["#01FABF", "#FA01ED", "#5601FA", "#000"]);

  // Per-type markers, as they don't inherit styles.
  svg.append("defs").selectAll("marker")
    .data(interactions)
    .join("marker")
    .attr("id", d => `arrow-${d}`)
    .attr("viewBox", "20 15 40 40")
    .attr("refX", 15)
    .attr("refY", -0.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("fill", linkColors)
    .attr("d", "M0,-5L10,0L0,5");

  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke-width", 8)
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("stroke", d => linkColors(d.interaction))
    .attr("marker-end", d => `url(${new URL(`#arrow-${d.interaction}`, location)})`);

  showTooltip(link)

  const node = svg.append("g")
    .attr("fill", "currentColor")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(nodes)
    .join("g")

  node.append("circle")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("r", 16)
    .attr("fill", d => {
      return nodeColors(nodesMap.get(d.id)?.movie);
    });

  node.append("text")
    .attr("x", -32)
    .attr("y", "1.8em")
    .attr("font-size", 20)
    .text(d => {
      return nodesMap.get(d.id)?.name || d.id;
    })
    .clone(true).lower()
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 6);

  showTooltip(node);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-600))
    .force("x", d3.forceX())
    .force("y", d3.forceY());

  simulation.on("tick", () => {
    link.attr("d", linkArc);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  function linkArc(d) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
    return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
  }

  function showTooltip(ele) {
    ele.on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      let tooltipHtml = "No Data Found";
      if (d.interaction) { // it's an edge
        tooltipHtml = `Interaction: ${d.interaction}`;
      } else { // it is a node
        const nodeDetails = nodesMap.get(d.id);
        if (nodeDetails) {
          tooltipHtml = `ID: ${nodeDetails.id} <br> Name: ${nodeDetails.name} <br> Movie: ${nodeDetails.movie} <br> Description: ${nodeDetails.description}`;
        }
      }
      tooltip.html(tooltipHtml)
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 20) + "px").style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    });
  }
})

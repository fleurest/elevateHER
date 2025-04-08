import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import HamburgerMenu from './HamburgerMenu';

function HomePage({ handleLogout }) {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const cyContainerRef = useRef(null);
  const cyInstanceRef = useRef(null);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const res = await fetch('http://localhost:3001/api/graph');
        const data = await res.json();
        console.log('Graph Data:', data);
        setGraphData(data);
      } catch (err) {
        console.error('Error fetching graph:', err);
      }
    }
    fetchGraph();
  }, []);

  useEffect(() => {
    if (!graphData) return;

    const timeout = setTimeout(() => {
      if (!cyContainerRef.current) return;

      const nodes = graphData.nodes.map(n => ({ data: n.data }));
      const edges = graphData.edges.map(e => ({ data: e.data }));
      const elements = [...nodes, ...edges];

      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
      }

      const cy = cytoscape({
        container: cyContainerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#0074D9',
              'label': 'data(label)',
              'color': '#fff',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': 10,
              'width': 40,
              'height': 40
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': 8,
              'text-background-color': '#fff',
              'text-background-opacity': 1,
              'text-background-shape': 'roundrectangle',
              'text-rotation': 'none',
              'text-margin-y': -10,
              'min-zoomed-font-size': 4
            }
          }
        ],
        layout: { name: 'cose', animate: true }
      });

      cy.on('tap', 'node', (evt) => {
        setSelectedNode(evt.target.data());
      });

      cyInstanceRef.current = cy;
      // delay to allow container to mount
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
      }
    };
  }, [graphData]);

  return (
    <div className="home-page-layout">
      <div className="home-page-column home-page-left">
        <h2>Explore</h2>
        <ul className="space-y-2">
          <li className="hover:underline cursor-pointer">Friends</li>
          <li className="hover:underline cursor-pointer">Players</li>
          <li className="hover:underline cursor-pointer">Sports</li>
          <li className="hover:underline cursor-pointer">Events</li>
        </ul>
      </div>

      <div className="home-page-column home-page-center">
        <h2>Network</h2>
        <div ref={cyContainerRef} style={{ height: '500px', width: '100%' }} />
      </div>

      <div className="home-page-column home-page-right">
        <h2>Details</h2>
        {selectedNode ? (
          <div>
            {Object.entries(selectedNode).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {JSON.stringify(value)}</p>
            ))}
          </div>
        ) : (
          <p>Click a node to see details.</p>
        )}
      </div>
    </div>
  );
}

export default HomePage;
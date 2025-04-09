import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import HamburgerMenu from './HamburgerMenu';

function HomePage({ handleLogout }) {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState(null);
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
    if (!graphData || !cyContainerRef.current || !cyContainerRef.current.offsetParent) return;

    const timeout = setTimeout(() => {
      try {
        let nodes = graphData.nodes;
        let edges = graphData.edges;

        if (filterType) {
          nodes = nodes.filter(n => n.data.label === filterType);
        }

        const nodeIds = new Set(nodes.map(n => n.data.id));
        edges = edges.filter(e => nodeIds.has(e.data.source) && nodeIds.has(e.data.target));

        const elements = [...nodes.map(n => ({ data: n.data })), ...edges.map(e => ({ data: e.data }))];

        if (cyInstanceRef.current) {
          cyInstanceRef.current.destroy();
          cyInstanceRef.current = null;
        }

        if (elements.length === 0) {
          console.warn('No elements to display in Cytoscape.');
          return;
        }

        const cy = cytoscape({
          container: cyContainerRef.current,
          elements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#35374b',
                'label': 'data(name)',
                'color': '#f1f2f3',
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
                'line-color': '#797ca0',
                'target-arrow-color': '#797ca0',
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
          layout: { name: 'breadthfirst', direction: 'TB', animate: true }
        });

        cy.on('tap', 'node', (evt) => {
          setSelectedNode(evt.target.data());
        });

        cyInstanceRef.current = cy;
      } catch (err) {
        console.error('Cytoscape init error:', err);
      }
      
    }, 150);

    return () => {
      clearTimeout(timeout);
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }
    };
  }, [graphData, filterType]);

  return (
    <div className="home-page-layout">
      <div className="home-page-column home-page-left">
        <h2>Explore</h2>
        <ul className="space-y-2">
          <li className="cursor-pointer">
            Friends <button onClick={() => setFilterType('Friend')}>+</button>
          </li>
          <li className="cursor-pointer">
            Players <button onClick={() => setFilterType('Player')}>+</button>
          </li>
          <li className="cursor-pointer">
            Sports <button onClick={() => setFilterType('Sport')}>+</button>
          </li>
          <li className="cursor-pointer">
            Events <button onClick={() => setFilterType('Event')}>+</button>
          </li>
          <li className="cursor-pointer text-sm mt-2 underline" onClick={() => setFilterType(null)}>Reset Filter</li>
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

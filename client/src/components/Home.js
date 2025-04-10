import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import HamburgerMenu from './HamburgerMenu';
import logo from '../assets/logo-default-profile.png';

import homeIcon from '../assets/icon_home.png';
import playersIcon from '../assets/icon_player.png';
import eventsIcon from '../assets/icon_events.png';
import pagesIcon from '../assets/icon_pages.png';

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
      {/* First column (Logo + Favourites + Explore) */}
      <div className="home-page-column home-page-left">
        <div className="logo-section">
          <img src={logo} alt="Logo" className="small-logo" />
        </div>

        <div className="favourites-section">
          <h2>Favourites</h2>
          <ul>
            <li>My Profile</li>
            <li>My Players</li>
          </ul>
        </div>

        <div className="explore-section">
          <h2>Explore</h2>
          <ul>
            <li>Friends <button onClick={() => setFilterType('Friend')}>+</button></li>
            <li>Players <button onClick={() => setFilterType('Player')}>+</button></li>
            <li>Sports <button onClick={() => setFilterType('Sport')}>+</button></li>
            <li>Events <button onClick={() => setFilterType('Event')}>+</button></li>
            <li className="reset-filter" onClick={() => setFilterType(null)}>Reset Filter</li>
          </ul>
        </div>
      </div>

      <div className="home-page-column home-page-center">
        <div className="icon-bar-wrapper">
          <div className="center-top-icons">
            <a href="#home" className="icon-link my-icon home-icon" />
            <a href="#my-players" className="icon-link my-icon players-icon" />
            <a href="#events" className="icon-link my-icon events-icon" />
            <a href="#pages" className="icon-link my-icon pages-icon" />
          </div>
        </div>

        <h2>Network</h2>
        <div ref={cyContainerRef} style={{ height: '500px', width: '100%' }} />
      </div>

      {/* Third column (Details) */}
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

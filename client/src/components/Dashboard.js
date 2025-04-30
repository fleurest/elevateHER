import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import HamburgerMenu from './HamburgerMenu';

const Dashboard = ({ handleLogout }) => {
  const [athletes, setAthletes] = useState([]);
  const [graphNodes, setGraphNodes] = useState([]);
  const [pageRanks, setPageRanks] = useState([]);
  const [communities, setCommunities] = useState([]);
  const cyContainerRef = useRef(null);
  const cyInstanceRef = useRef(null);

  const fetchPageRank = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/graph/pagerank');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const top100Names = data.slice(0, 100).map(p => p.name);
      const top5Ranks = data.slice(0, 5);

      setPageRanks(top5Ranks);
      setGraphNodes(top100Names);

      const relRes = await fetch('http://localhost:3001/api/graph/filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: top100Names })
      });

      if (!relRes.ok) throw new Error('Failed to fetch filtered graph');
      const graphData = await relRes.json();

      const nodes = graphData.nodes || [];
      const edges = graphData.edges || [];
      const elements = [...nodes, ...edges];

      if (cyInstanceRef.current) cyInstanceRef.current.destroy();

      const cy = cytoscape({
        container: cyContainerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#fff',
              'background-image': 'data(image)',
              'background-fit': 'cover',
              'border-width': 3,
              'border-color': '#0074D9',
              'label': 'data(label)',
              'color': '#000',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'font-size': 10,
              'width': 50,
              'height': 50
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

      cyInstanceRef.current = cy;
    } catch (err) {
      console.error('PageRank-based graph load failed:', err);
    }
  };

  const fetchCommunities = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/graph/communities');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCommunities(data);
    } catch (err) {
      console.error('Communities fetch failed:', err);
    }
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/athletes')
      .then(res => res.json())
      .then(data => {
        setAthletes(data);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchGraph = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/graph', {
          credentials: 'include'
        });
        const graphData = await res.json();

        if (isMounted && cyContainerRef.current) {
          const nodes = graphData.nodes || [];
          const edges = graphData.edges || [];
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
                  'background-color': '#fff',
                  'background-image': 'data(image)',
                  'background-fit': 'cover',
                  'border-width': 3,
                  'border-color': '#0074D9',
                  'label': 'data(label)',
                  'color': '#000',
                  'text-valign': 'bottom',
                  'text-halign': 'center',
                  'font-size': 10,
                  'width': 50,
                  'height': 50
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

          cyInstanceRef.current = cy;
        }
      } catch (err) {
        console.error('Graph fetch error:', err);
      }
    };

    fetchGraph();

    return () => {
      isMounted = false;
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div>
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
        <HamburgerMenu handleLogout={handleLogout} />
      </div>
      <div style={{ marginTop: '60px' }}>
        <h1>Athlete Graph Visualization</h1>
        <div
          ref={cyContainerRef}
          style={{ height: '600px', width: '100%', border: '1px solid lightgray', marginBottom: '30px' }}
        ></div>
        <h2>Top Ranked Athletes:</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {athletes
            .filter(athlete => graphNodes.includes(athlete.name))
            .map((athlete, index) => (
              <div key={index} style={{ margin: '10px', textAlign: 'center' }}>
                <img
                  src={athlete.image}
                  alt={athlete.name}
                  style={{ width: '80px', height: '80px', borderRadius: '50%' }}
                />
                <p>{athlete.name}</p>
              </div>
            ))}
        </div>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button onClick={fetchPageRank}>Refresh PageRank from Neo4j</button>
        <button onClick={fetchCommunities} style={{ marginLeft: '10px' }}>Detect Communities</button>

        {pageRanks.length > 0 && (
          <div>
            <h3>Top 5 Influential Athletes (by PageRank)</h3>
            <ul>
              {pageRanks.map((p, i) => (
                <li key={i}>{p.name}: {p.score.toFixed(3)}</li>
              ))}
            </ul>
          </div>
        )}

        {communities.length > 0 && (
          <div>
            <h3>Communities</h3>
            <ul>
              {communities.map((c, i) => (
                <li key={i}>{c.name}: Community {c.communityId}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

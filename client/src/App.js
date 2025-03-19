import React, { useEffect, useState, useRef } from 'react';
import cytoscape from 'cytoscape';

function App() {
  const [athletes, setAthletes] = useState([]);
  const cyRef = useRef(null);

  // Get athletes
  useEffect(() => {
    fetch('http://localhost:3000/api/athletes')
      .then(res => res.json())
      .then(data => {
        console.log('Athletes Data:', data);
        setAthletes(data);
      })
      .catch(err => console.error(err));
  }, []);

  // Get graph data and draw it
  useEffect(() => {
    fetch('http://localhost:3000/api/graph')
      .then(res => res.json())
      .then(graphData => {
        if (cyRef.current) {
          const nodes = graphData.nodes || [];
          const edges = graphData.edges || [];
          const elements = [...nodes, ...edges];

          cytoscape({
            container: cyRef.current,
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
        }
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Athlete Graph Visualization</h1>

      <div
        ref={cyRef}
        style={{ height: '600px', width: '100%', border: '1px solid lightgray', marginBottom: '30px' }}
      ></div>

      <h2>Athletes:</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {athletes.map((athlete, index) => (
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
  );
}

export default App;

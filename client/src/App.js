import { useEffect, useState } from 'react';

function App() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    // For fetch request
    fetch('http://localhost:3000/api/nodes')
      .then(res => res.json())
      .then(data => {
        console.log(data);
        setNodes(data);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Neo4j Nodes:</h1>
      <ul>
        {nodes.map((node, index) => (
          <li key={index}>{JSON.stringify(node)}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

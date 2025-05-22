import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import HamburgerMenu from './HamburgerMenu';

import iconPlayer from '../assets/icon_player.png';

cytoscape.use(coseBilkent);

const modeOptions = [
  { id: 'menu_dynamic', title: 'Dynamic mode allows you to add individuals and view their shared connections.', src: iconPlayer, alt: 'Dynamic Mode', label: 'Dynamic', mode: 'dynamic' },
  { id: 'menu_similar', title: 'Similar mode groups individuals by shared attributes.', src: iconPlayer, alt: 'Similar Mode', label: 'Similar', mode: 'similar' },
  { id: 'menu_fixed', title: 'Fixed mode pins most connected individuals for clarity.', src: iconPlayer, alt: 'Fixed Mode', label: 'Fixed', mode: 'fixed' }
];

const ModeMenu = ({ currentMode, onSelect }) => (
  <>
    {modeOptions.map(({ id, title, src, alt, label, mode }, idx) => (
      <div
        key={id}
        id={id}
        title={title}
        style={{
          cursor: 'pointer',
          position: 'absolute',
          right: `${5 + idx * 75}px`,
          top: '0px',
          height: '85px',
          width: '65px',
          opacity: currentMode === mode ? 1 : 0.3,
          pointerEvents: 'auto',
          zIndex: 1003,
          transition: 'opacity 0.2s ease',
          textAlign: 'center'
        }}
        onClick={() => onSelect(mode)}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = currentMode === mode ? '1' : '0.3')}
      >
        <img src={src} alt={alt} style={{ width: '100%', height: '65px' }} />
        <div style={{ marginTop: '4px', fontSize: '12px', color: currentMode === mode ? '#000' : '#666' }}>
          {label}
        </div>
      </div>
    ))}
  </>
);

const PopUp = ({ person, position }) => {
  if (!person || !position) return null;
  const { name, role, sport, nationality, birthDate, image } = person;
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`;
  return (
    <div
      id="popUp"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: 'rgba(0,0,0,0.85)',
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
        width: '250px',
        zIndex: 1005
      }}
    >
      <img
        src={image}
        alt={name}
        onError={(e) => { e.target.onerror = null; e.target.src = iconPlayer; }}
        style={{ height: '75px', width: '75px', position: 'absolute', left: 0, top: 0 }}
      />
      <span style={{ position: 'absolute', left: 80, top: 0, fontWeight: 'bold' }}>{name}</span>
      <div style={{ fontSize: '10px', width: '138px', marginLeft: '80px', marginTop: '22px' }}>
        {role && <>Role: {role}<br /></>}
        {sport && <>Sport: {sport}<br /></>}
        {nationality && <>Nationality: {nationality}<br /></>}
        {birthDate && <>Born: {birthDate}<br /></>}
        <a href={wikiUrl} target="_blank" rel="noopener noreferrer">From Wikipedia</a>
      </div>
    </div>
  );
};

const Dashboard = ({ handleLogout }) => {
  const [mode, setMode] = useState('dynamic');
  const [pageRanks, setPageRanks] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [popupData, setPopupData] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [hoverData, setHoverData] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);

  const fmt = d => {
    if (!d) return '';
    if (typeof d.toString === 'function') {
      const str = d.toString();
      if (!str.includes('[object')) {
        return str;
      }
    }
    if (d.year != null && d.month != null && d.day != null) {
      const year = typeof d.year.toNumber === 'function' ? d.year.toNumber() : d.year;
      const month = typeof d.month.toNumber === 'function' ? d.month.toNumber() : d.month;
      const day = typeof d.day.toNumber === 'function' ? d.day.toNumber() : d.day;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  };
  useEffect(() => {
    fetch(`${process.env.API_BASE}/api/athletes`)
      .then(res => res.json())
      .then(data => setAthletes(data))
      .catch(console.error);
  }, []);

  const drawGraph = data => {
    if (cyRef.current) cyRef.current.destroy();
    const cy = cytoscape({
      container: cyContainerRef.current,
      elements: [
        ...(data.nodes || []).map(n => {
          // uses stored profileImage
          let img = n.data.image || n.data.profileImage;
          // defaults to Wikipedia
          if (!img) {
            const wikiName = n.data.label.replace(/ /g, '_');
            img = `https://en.wikipedia.org/wiki/Special:FilePath/${wikiName}.jpg`;
          }
          n.data.image = img;
          return n;
        }),
        
        ...(data.edges || [])
      ],
      style: [
        { selector: 'node', style: { 'background-color': '#fff', 'background-image': 'data(image)', 'background-fit': 'cover', 'border-width': 3, 'border-color': '#0074D9', label: 'data(label)', fontSize: 10, width: 50, height: 50 } },
        { selector: 'edge', style: { width: 2, 'line-color': '#ccc', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } }
      ],
      layout: { name: 'cose-bilkent', animate: true }
    });

    if (mode === 'fixed') {
      const topFive = cy.nodes().sort((a, b) => b.degree() - a.degree()).slice(0, 5);
      topFive.forEach(n => n.lock());
    }

    cy.on('tap', 'node', evt => {
      const n = evt.target;
      const d = n.data();
      cy.elements().addClass('faded');
      n.removeClass('faded');
      n.connectedEdges().removeClass('faded');
      n.connectedEdges().connectedNodes().removeClass('faded');
      cy.center(n);
      cy.zoom({ level: 2, position: n.position() });
      window.history.pushState({}, '', `?person=${encodeURIComponent(d.label.replace(/ /g, '_'))}`);
      const p = n.renderedPosition();
      setPopupData({ name: d.label, role: d.primaryRole, sport: d.sport, nationality: d.nationality, image: d.image });
      setPopupPosition({ x: p.x + 20, y: p.y + 20 });
    });
    cy.on('mouseover', 'node', evt => {
      const n = evt.target;
      const d = n.data();
      const p = n.renderedPosition();
      cy.elements().addClass('faded');
      n.removeClass('faded');
      n.connectedEdges().removeClass('faded');
      n.connectedEdges().connectedNodes().removeClass('faded');
      const bd = fmt(d.birthDate);
      setHoverData({ name: d.label, role: d.primaryRole, sport: d.sport, nationality: d.nationality});
      setHoverPosition({ x: p.x + 20, y: p.y + 20 });
    });
    cy.on('mouseout', 'node', () => {
      cy.elements().removeClass('faded');
      setHoverData(null);
    });
    cy.on('tap', evt => {
      if (evt.target === cy) {
        cy.elements().removeClass('faded');
        setPopupData(null);
        setHoverData(null);
      }
    });

    const params = new URLSearchParams(window.location.search);
    const personParam = params.get('person');
    if (personParam) {
      const name = decodeURIComponent(personParam.replace(/_/g, ' '));
      const match = cy.nodes().filter(n => n.data('label') === name);
      if (match.length) match.tap();
    }

    cyRef.current = cy;
  };

  useEffect(() => {
    if (mode === 'dynamic') {
      drawGraph({ nodes: [], edges: [] });
    } else if (mode === 'similar') {
      const params = new URLSearchParams(window.location.search);
      const personParam = params.get('person');
      if (personParam) {
        const name = decodeURIComponent(personParam.replace(/_/g, ' '));
        fetch(`${process.env.API_BASE}/api/graph`)
          .then(res => res.json())
          .then(graphData => {
            const allNodes = graphData.nodes || [];
            const allEdges = graphData.edges || [];
            const root = allNodes.find(n => n.data.label === name);
            if (root) {
              const { sport, nationality, olympicGames } = root.data;
              const filteredNodes = allNodes.filter(n =>
                n.data.sport === sport ||
                n.data.nationality === nationality ||
                (olympicGames && n.data.olympicGames === olympicGames)
              );
              const filteredEdges = allEdges.filter(e =>
                filteredNodes.some(n => n.data.id === e.data.source) &&
                filteredNodes.some(n => n.data.id === e.data.target)
              );
              drawGraph({ nodes: filteredNodes, edges: filteredEdges });
            } else {
              drawGraph({ nodes: [], edges: [] });
            }
          })
          .catch(console.error);
      } else {
        drawGraph({ nodes: [], edges: [] });
      }
    } else {
      fetch(`${process.env.API_BASE}/api/graph`)
        .then(res => res.json())
        .then(drawGraph)
        .catch(console.error);
    }
    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [mode]);

  const handlePageRank = async () => {
    try {
      const res = await fetch(`${process.env.API_BASE}/api/graph/pagerank`);
      let data = await res.json();
      if (!Array.isArray(data)) data = data.data || [];
      setPageRanks(data.slice(0, 5));
      const names = data.slice(0, 100).map(p => p.name);
      const r = await fetch(`${process.env.API_BASE}/api/graph/filtered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names })
      });
      const filtered = await r.json();
      drawGraph(filtered);
    } catch (e) {
      console.error('PageRank error', e);
    }
  };

  const handleCommunities = async () => {
    try {
      const res = await fetch(`${process.env.API_BASE}/api/graph/communities`);
      let data = await res.json();
      if (!Array.isArray(data)) data = data.communities || data;
      setCommunities(data);
      if (data.nodes && data.edges) drawGraph(data);
    } catch (e) {
      console.error('Communities error', e);
    }
  };

  const downloadFile = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!cyRef.current) return;
    const nodes = cyRef.current.nodes().map(n => n.data());
    const edges = cyRef.current.edges().map(e => e.data());

    const nodesHeader = ['id', 'label'];
    const nodesRows = nodes.map(n =>
      [
        JSON.stringify(n.id),
        JSON.stringify(n.label || '')
      ].join(',')
    );
    const nodesCsv = [nodesHeader.join(','), ...nodesRows].join('\n');
    downloadFile(nodesCsv, 'nodes.csv', 'text/csv');

    if (edges.length) {
      const edgesHeader = ['id', 'source', 'target', 'label'];
      const edgesRows = edges.map(e =>
        [
          JSON.stringify(e.id),
          JSON.stringify(e.source),
          JSON.stringify(e.target),
          JSON.stringify(e.label || '')
        ].join(',')
      );
      const edgesCsv = [edgesHeader.join(','), ...edgesRows].join('\n');
      downloadFile(edgesCsv, 'edges.csv', 'text/csv');
    } else {
      console.info('No relationships found; only nodes.csv was downloaded.');
    }

  };

  const exportJSON = () => {
    if (!cyRef.current) return;
    const elements = cyRef.current.elements().map(ele => ({
      group: ele.group(),
      data: ele.data()
    }));
    const json = JSON.stringify({ elements }, null, 2);
    downloadFile(json, 'graph.json', 'application/json');
  };

  const exportGEXF = () => {
    if (!cyRef.current) return;
    const nodes = cyRef.current.nodes().map(n => n.data());
    const edges = cyRef.current.edges().map(e => e.data());

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const gexfOpen = '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">';
    const graphOpen = '<graph mode="static" defaultedgetype="directed">';

    const nodesXml = [
      '<nodes>',
      ...nodes.map(n =>
        `<node id="${n.id}" label="${(n.label || '').replace(/"/g, '&quot;')}" />`
      ),
      '</nodes>'
    ].join('');

    let edgesXml = '';
    if (edges.length) {
      edgesXml = [
        '<edges>',
        ...edges.map(e =>
          `<edge id="${e.id}" source="${e.source}" target="${e.target}" label="${(e.label || '').replace(/"/g, '&quot;')}" />`
        ),
        '</edges>'
      ].join('');
    } else {
      console.info('No relationships found; exporting nodes-only GEXF.');
    }

    const gexfClose = '</graph></gexf>';
    const fullGexf = xmlHeader + gexfOpen + graphOpen + nodesXml + edgesXml + gexfClose;

    downloadFile(fullGexf, 'graph.gexf', 'application/xml');
  };

  const filteredAthletes = athletes.filter(a =>
    (a.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );
  const addNode = athlete => {
    if (!cyRef.current) return;
    if (cyRef.current.getElementById(athlete.name).length) return;
    cyRef.current.add({ group: 'nodes', data: { id: athlete.name, label: athlete.name, image: athlete.image } });
    cyRef.current.layout({ name: 'cose-bilkent', animate: true }).run();
  };

  return (
    <div>
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
        <HamburgerMenu handleLogout={handleLogout} />
      </div>
      <ModeMenu currentMode={mode} onSelect={setMode} />

      {mode === 'dynamic' && (
        <div style={{ position: 'fixed', top: '85px', left: '10px', width: '200px', height: 'calc(100% - 100px)', background: '#fff', padding: '10px', overflowY: 'auto', zIndex: 1002 }}>
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
          />
          {filteredAthletes.map((a, index) => (
            <div
              key={`${a.name}-${index}`}
              onClick={() => addNode(a)}
              style={{ padding: '5px', borderBottom: '1px solid #eee', cursor: 'pointer' }}
            >
              {a.name}
            </div>
          ))}

        </div>
      )}

      <div ref={cyContainerRef} style={{ position: 'absolute', top: 0, bottom: 0, left: mode === 'dynamic' ? '220px' : 0, right: 0 }} />

      <div style={{ position: 'fixed', top: '70px', left: mode === 'dynamic' ? '220px' : '10px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', zIndex: 1001 }}>
        <button onClick={handlePageRank}>PageRank</button>
        <button onClick={handleCommunities} style={{ marginLeft: '10px' }}>Communities</button>
      </div>
      <button onClick={exportCSV} style={{ marginLeft: '10px' }}>
        Export CSV
      </button>
      <button onClick={exportJSON} style={{ marginLeft: '10px' }}>
        Export JSON
      </button>
      <button onClick={exportGEXF} style={{ marginLeft: '10px' }}>
        Export GEXF
      </button>
      {hoverData && hoverPosition && (
        <div style={{ position: 'fixed', top: hoverPosition.y, left: hoverPosition.x, backgroundColor: 'rgba(255,255,255,0.9)', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', zIndex: 1003, fontSize: '12px', pointerEvents: 'none' }}>
          <strong>{hoverData.name}</strong><br />
          {hoverData.role && <>Role: {hoverData.role}<br /></>}
          {hoverData.sport && <>Sport: {hoverData.sport}<br /></>}
          {hoverData.nationality && <>Nationality: {hoverData.nationality}<br /></>}
          {hoverData.birthDate && <>Born: {hoverData.birthDate}</>}
        </div>
      )}

      {popupData && popupPosition && <PopUp person={popupData} position={popupPosition} />}
    </div>
  );
};

export default Dashboard;
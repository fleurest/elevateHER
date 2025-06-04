import React, { useState, useEffect } from 'react';

function Search({ user }) {
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('');
  const [entityType, setEntityType] = useState('person');
  const [newInputData, setNewInputData] = useState({});
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({});

  const isChanged = (key) => newInputData[key] && newInputData[key] !== formData[key];

  useEffect(() => {
    setFormData({
      name: query || '',
      nationality: '',
      gender: '',
      profileImage: '',
      birthDate: '',
      roles: '',
      primaryRole: '',
      sport: sport || '',
      description: '',
      foundingDate: '',
      location: '',
      image: '',
      sameAs: ''
    });
  }, [entityType, query, sport]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewInputData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResults([]);
    setSuggestions([]);
    setShowForm(false);

    try {
      const params = new URLSearchParams({ query });
      if (sport) params.append('sport', sport);
      const res = await fetch(`${process.env.API_BASE}/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.players || []);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError('Search failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const merged = {
      ...formData,
      ...newInputData,
      roles: (newInputData.roles || formData.roles || '')
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    };

    let url = '', method = 'POST', payload = merged;

    if (entityType === 'person') {
      url = editId ? `/api/player/uuid/${editId}` : '/api/athlete/create';
      method = editId ? 'PUT' : 'POST';
    } else if (entityType === 'organisation') {
      url = '/api/team/upsert';
    } else if (entityType === 'sport') {
      url = '/api/sport';
      payload = { name: merged.name, type: 'athlete', sportName: merged.sport };
    } else if (entityType === 'event') {
      url = '/api/events/create';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to save');
    } else {
      alert('Saved successfully');
      setShowForm(false);
      setEditId(null);
      setNewInputData({});
    }
  };

  const handleDelete = async (uuid) => {
    if (!window.confirm('Delete this item?')) return;
    const res = await fetch(`${process.env.API_BASE}/api/users/uuid/${uuid}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Deleted');
      handleSearch(new Event('submit'));
    } else {
      alert('Delete failed');
    }
  };

  return (
    <div className="card mb-4 shadow-sm border-0">
      <div className="card-header bg-purple text-grey d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Search & Manage</h5>
      </div>

      <div className="card-body bg-grey">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="row g-3">
            <div className="col-md-5">
              <label className="form-label text-navy fw-bold">Name or Keyword</label>
              <input
                type="text"
                className="form-control"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter name..."
              />
            </div>
            <div className="col-md-3">
              <label className="form-label text-navy fw-bold">Sport</label>
              <select className="form-select" value={sport} onChange={(e) => setSport(e.target.value)}>
                <option value="">All Sports</option>
                <option value="Soccer">Soccer</option>
                <option value="Cricket">Cricket</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label text-navy fw-bold">Entity Type</label>
              <select className="form-select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                <option value="person">Athlete</option>
                <option value="organisation">Team</option>
                <option value="sport">Sport</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div className="col-md-1 d-grid align-items-end">
              <button type="submit" className="btn fw-bold" style={{ backgroundColor: 'var(--purple)', color: 'white' }}>
                Go
              </button>
            </div>
          </div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        {results.map((r) => (
          <div key={r.id} className="card mb-3">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-navy mb-0">{r.name}</h6>
                <small className="text-muted">
                  {r.nationality || r.description || 'No description'}
                </small>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary btn-sm" onClick={() => {
                  setEditId(r.id);
                  setFormData({ ...r, roles: r.roles?.join(', ') || '' });
                  setNewInputData({});
                  setShowForm(true);
                }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 border-top pt-4">
            <h6 className="text-navy fw-bold mb-3">{editId ? 'Edit' : 'Add New'} {entityType}</h6>

            <div className="row g-3">
              {editId && <label className="form-label text-purple">Current name: {formData.name}</label>}
              <input className="form-control" name="name" value={newInputData.name || ''} onChange={handleFormChange} placeholder="New name (optional)" />

              {entityType === 'person' && (
                <>
                  <input className="form-control" name="nationality" value={newInputData.nationality || ''} onChange={handleFormChange} placeholder="Nationality" />
                  <input className="form-control" name="gender" value={newInputData.gender || ''} onChange={handleFormChange} placeholder="Gender" />
                  <input className="form-control" name="birthDate" type="date" value={newInputData.birthDate || ''} onChange={handleFormChange} />
                  <input className="form-control" name="profileImage" value={newInputData.profileImage || ''} onChange={handleFormChange} placeholder="Image URL" />
                  <input className="form-control" name="roles" value={newInputData.roles || ''} onChange={handleFormChange} placeholder="Comma-separated roles" />
                  <input className="form-control" name="primaryRole" value={newInputData.primaryRole || ''} onChange={handleFormChange} placeholder="Primary role" />
                </>
              )}


              <input className="form-control" name="sport" value={newInputData.sport || ''} onChange={handleFormChange} placeholder="Sport" />
            </div>

            <div className="mt-3 d-grid">
              <button className="btn fw-bold" type="submit" style={{ backgroundColor: 'var(--purple)', color: 'white' }}>
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Search;

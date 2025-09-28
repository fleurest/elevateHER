import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../style.css';
import { API_BASE } from '../config';

function Search({ user }) {
    const [query, setQuery] = useState('');
    const [sport, setSport] = useState('');
    const [entityType, setEntityType] = useState('person');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showRelationshipForm, setShowRelationshipForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({});
    const [relationshipData, setRelationshipData] = useState({
        sourceName: '',
        targetName: '',
        relationshipType: '',
        sourceType: '',
        targetType: ''
    });
    const [loading, setLoading] = useState(false);

    // Available relationship types based on entity combinations
    const relationshipTypes = {
        'person-organisation': ['PARTICIPATES_IN', 'SPONSORED_BY'],
        'person-event': ['PARTICIPATES_IN'],
        'person-person': ['TRAINED_BY'],
        'person-award': ['WON'],
        'event-award': ['SPORT_AWARD'],
        'person-sport': ['PARTICIPATES_IN'],
        'person-award': ['WON'],
        'organisation-event': ['PARTICIPATES_IN'],
        'organisation-sport': ['PARTICIPATES_IN']
    };

    useEffect(() => {
        initializeFormData();
    }, [entityType, query, sport]);

    const initializeFormData = () => {
        let baseData = {
            name: query || ''
        };
        if (entityType !== 'sport') {
            baseData.sport = sport || '';
        }
        switch (entityType) {
            case 'person':
                setFormData({
                    ...baseData,
                    nationality: '',
                    gender: '',
                    profileImage: '',
                    birthDate: '',
                    roles: '',
                    primaryRole: '',
                    description: ''
                });
                break;
            case 'organisation':
                setFormData({
                    ...baseData,
                    alternateName: '',
                    roles: '',
                    location: ''
                });
                break;
            case 'sport':
                setFormData({
                    name: query || '',
                    alternateName: '',
                    iocDisciplineCode: ''
                });
                break;
            case 'event':
                setFormData({
                    ...baseData,
                    description: '',
                    location: '',
                    year: '',
                    foundingDate: '',
                    roles: '',
                    sameAs: ''
                });
                break;
            default:
                setFormData(baseData);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRelationshipChange = (e) => {
        const { name, value } = e.target;
        setRelationshipData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        setResults([]);
        try {
            const apiBase = process.env.REACT_APP_API_BASE || '';
            const response = await fetch(`${apiBase}/api/athletes/search?query=${encodeURIComponent(query)}&type=${entityType}&sport=${encodeURIComponent(sport)}`);
            if (!response.ok) {
                throw new Error('Search request failed');
            }
            // Defensive: try to parse only if content-type is JSON
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // fallback: try to parse as text, but catch parse errors
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    throw new Error('Invalid JSON response from server');
                }
            }
            setResults(Array.isArray(data) ? data : (Array.isArray(data.players) ? data.players : []));
            if (!data || (Array.isArray(data) && data.length === 0)) {
                setError('No results found.');
            }
        } catch (err) {
            setError('Search failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            let processedData = { ...formData };

            // Check for existing sport by name (case-insensitive)
            if (entityType === 'sport' && processedData.name) {
                try {
                    const existingRes = await fetch(`${API_BASE || ''}/api/sports`);
                    if (existingRes.ok) {
                        const existing = await existingRes.json();
                        const lowerName = processedData.name.toLowerCase();
                        const exists = existing.some(s => (s.name || '').toLowerCase() === lowerName);
                        if (exists) {
                            setError('Sport already exists');
                            return;
                        }
                    }
                } catch (checkErr) {
                    console.error('Error checking existing sports:', checkErr);
                }
            }

            // Restrict organisation payload to allowed fields
            if (entityType === 'organisation') {
                processedData = {
                    name: processedData.name,
                    alternateName: processedData.alternateName || '',
                    sport: processedData.sport || '',
                    roles: processedData.roles || [],
                    location: processedData.location || ''
                };
            }

            let url, method, endpoint;

            switch (entityType) {
                case 'person':
                    endpoint = editId ? `/api/athletes/uuid/${editId}` : '/api/athletes';
                    method = editId ? 'PUT' : 'POST';
                    break;
                case 'organisation':
                    endpoint = '/api/organisations';
                    method = 'POST';
                    break;
                case 'sport':
                    endpoint = '/api/sports/create';
                    method = 'POST';
                    break;
                case 'event':
                    endpoint = '/api/events';
                    method = 'POST';
                    break;
                default:
                    throw new Error('Invalid entity type');
            }

            const res = await fetch(`${API_BASE || ''}${endpoint}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processedData)
            });

            // 401 handling for edit (PUT)
            if (editId && res.status === 401) {
                setError('Session expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1800);
                return;
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.message || 'Failed to save');
            }

            if (entityType === 'sport' && data.message) {
                setSuccess(data.message);
            } else {
                setSuccess(`${entityType} ${editId ? 'updated' : 'created'} successfully!`);
            }
            setTimeout(() => setSuccess(''), 2500);
            setShowForm(false);
            setEditId(null);
            initializeFormData();

            // Refresh search results
            if (query) {
                handleSearch(new Event('submit'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRelationship = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const { sourceName, targetName, relationshipType, sourceType, targetType } = relationshipData;

        if (!sourceName || !targetName || !relationshipType) {
            setError('All relationship fields are required');
            setLoading(false);
            return;
        }

        try {
            const endpoint = `/api/relationships`;
            const payload = {
                sourceName,
                targetName,
                sourceType,
                targetType,
                relationshipType
            };

            const res = await fetch(`${process.env.REACT_APP_API_BASE || ''}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create relationship');
            }

            setSuccess('Relationship created successfully!');
            setTimeout(() => setSuccess(''), 2500);
            setShowRelationshipForm(false);
            setRelationshipData({
                sourceName: '',
                targetName: '',
                relationshipType: '',
                sourceType: '',
                targetType: ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditId(item.id || item.uuid);
        const editData = { ...item };

        // Handle roles array for display
        if (editData.roles && Array.isArray(editData.roles)) {
            editData.roles = editData.roles.join(', ');
        }

        // Handle alternateName array for display
        if (editData.alternateName && Array.isArray(editData.alternateName)) {
            editData.alternateName = editData.alternateName.join(', ');
        }

        setFormData(editData);
        setShowForm(true);
    };

    const handleDelete = async (uuid) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            const endpoint = entityType === 'person' ? 'users' : entityType;
            const res = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/${endpoint}/uuid/${uuid}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setSuccess('Item deleted successfully');
                handleSearch(new Event('submit'));
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Delete failed');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const getRelationshipOptions = () => {
        const { sourceType, targetType } = relationshipData;
        const key = `${sourceType}-${targetType}`;
        return relationshipTypes[key] || [];
    };

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ width: '100%', maxWidth: '900px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: '32px 24px', borderRadius: '16px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
                    <h2 className="auth-title" style={{ marginBottom: 0, fontWeight: 700, fontSize: '2rem', color: 'var(--navy)' }}>Search & Create</h2>
                    <Link to="/home" className="events-back-btn" style={{ fontSize: '1rem', color: 'var(--purple)', textDecoration: 'none', fontWeight: 500 }}>
                        ← Back to Home
                    </Link>
                </div>
                {/* Alert Messages */}
                {(error || success) && (
                    <div style={{ marginBottom: '20px', position: 'relative' }}>
                        {error && <div className="auth-error" style={{ background: '#ffeaea', color: '#b00020', borderRadius: '6px', padding: '12px 16px', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>{error} <button aria-label="Dismiss error" style={{ float: 'right', background: 'none', border: 'none', color: '#b00020', fontWeight: 700, cursor: 'pointer' }} onClick={() => setError('')}>×</button></div>}
                        {success && <div style={{ background: '#e8f5e8', color: '#2e7d32', borderRadius: '6px', padding: '12px 16px', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>{success} <button aria-label="Dismiss success" style={{ float: 'right', background: 'none', border: 'none', color: '#2e7d32', fontWeight: 700, cursor: 'pointer' }} onClick={() => setSuccess('')}>×</button></div>}
                    </div>
                )}
                {/* Loading Spinner */}
                {loading && <div style={{ textAlign: 'center', marginBottom: '16px' }}><span className="loader" style={{ display: 'inline-block', width: '32px', height: '32px', border: '4px solid #eee', borderTop: '4px solid var(--purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span></div>}
                {/* Search Form */}
                <form onSubmit={handleSearch} style={{ width: '100%', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        className="auth-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, event, or team..."
                        aria-label="Search term"
                        style={{ flex: 2, minWidth: '180px' }}
                    />
                    <select className="auth-input" value={sport} onChange={(e) => setSport(e.target.value)} aria-label="Sport" style={{ flex: 1, minWidth: '120px' }}>
                        <option value="">All Sports</option>
                        <option value="Soccer">Soccer</option>
                        <option value="Cricket">Cricket</option>
                        <option value="Basketball">Basketball</option>
                        <option value="Tennis">Tennis</option>
                    </select>
                    <select className="auth-input" value={entityType} onChange={(e) => setEntityType(e.target.value)} aria-label="Entity type" style={{ flex: 1, minWidth: '120px' }}>
                        <option value="person">Athletes/People</option>
                        <option value="organisation">Teams/Organizations</option>
                        <option value="sport">Sports</option>
                        <option value="event">Events</option>
                    </select>
                    <button className="auth-button" type="submit" style={{ flex: 'none', minWidth: '120px', fontWeight: 600 }}>Search</button>
                </form>
                <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #eee' }} />
                {/* Action Buttons */}
                <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
                    <button
                        className="auth-button-alt"
                        onClick={() => {
                            setShowForm(true);
                            setEditId(null);
                            initializeFormData();
                        }}
                        style={{ fontWeight: 600, minWidth: '160px' }}
                    >
                        + Add New {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                    </button>
                    <button
                        className="auth-button-alt"
                        onClick={() => {
                            setShowRelationshipForm(true);
                            setShowForm(false);
                            setQuery('');
                            setSport('');
                            setResults([]);
                            setSuggestions([]);
                            setRelationshipData({
                                sourceName: '',
                                targetName: '',
                                relationshipType: '',
                                sourceType: '',
                                targetType: ''
                            });
                        }}
                        style={{ fontWeight: 600, minWidth: '160px' }}
                    >
                        + Create Relationship
                    </button>
                </div>
                {/* Search Results */}
                {results.length > 0 && (
                    <div style={{ position: 'fixed', top: '80px', right: '32px', width: '400px', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(53,55,75,0.18)', padding: '28px 24px', zIndex: 1000, border: '1px solid #eee', transition: 'right 0.2s' }}>
                        <h3 style={{ color: 'var(--navy)', fontWeight: 700, marginBottom: '16px' }}>Search Results</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {results.map((item) => (
                                <div key={item.id || item.uuid || item.name} className="profile-panel" style={{ background: '#f9f9fc', borderRadius: '10px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', padding: '20px', position: 'relative', transition: 'box-shadow 0.2s', border: '1px solid #eee' }}>
                                    <h4 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '8px', color: 'var(--purple)' }}>{item.name}</h4>
                                    <div className="profile-details" style={{ fontSize: '1rem', color: '#444', marginBottom: '8px' }}>
                                        {item.sport && <p><strong>Sport:</strong> {item.sport}</p>}
                                        {item.nationality && <p><strong>Nationality:</strong> {item.nationality}</p>}
                                        {item.location && <p><strong>Location:</strong> {item.location}</p>}
                                        {item.description && <p><strong>Description:</strong> {item.description}</p>}
                                        {item.year && <p><strong>Year:</strong> {item.year}</p>}
                                        {item.iocDisciplineCode && <p><strong>IOC Code:</strong> {item.iocDisciplineCode}</p>}
                                    </div>
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button
                                            className="auth-button-alt"
                                            onClick={() => handleEdit(item)}
                                            style={{ fontWeight: 500, minWidth: '36px', padding: '4px 8px', fontSize: '0.95rem', background: '#f3f3f7', color: '#888', border: 'none', borderRadius: '6px', boxShadow: 'none', transition: 'background 0.2s', opacity: 0.7 }}
                                            title="Edit"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            className="auth-button"
                                            onClick={() => handleDelete(item.id || item.uuid)}
                                            style={{ fontWeight: 500, minWidth: '36px', padding: '4px 8px', fontSize: '0.95rem', background: '#ffeaea', color: '#b00020', border: 'none', borderRadius: '6px', boxShadow: 'none', transition: 'background 0.2s', opacity: 0.7 }}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ color: 'var(--purple)', fontWeight: 600, marginBottom: '8px' }}>Did you mean?</h4>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {suggestions.map((suggestion) => (
                                <div key={suggestion.id} style={{ padding: '8px 14px', margin: '5px 0', background: '#f0f0f0', borderRadius: '6px', fontWeight: 500, color: '#444', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                                    <span>{suggestion.name}</span>
                                    {suggestion.sport && <span> ({suggestion.sport})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Entity Form */}
                {showForm && (
                    <>
                        {entityType === 'organisation' && (
                            <p style={{ color: 'grey', textAlign: 'center', marginBottom: '10px', fontSize: '0.95rem' }}>
                                Example: WTA Women's Tennis Association, Tennis association, United States
                            </p>
                        )}
                        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '20px', border: '1px solid var(--light-purple)', padding: '28px', borderRadius: '14px', background: 'var(--grey)', boxShadow: '0 2px 12px rgba(53,55,75,0.10)' }}>
                            <h3 style={{ color: 'var(--navy)', marginBottom: '20px', fontWeight: 700 }}>
                                {editId ? 'Edit' : 'Add New'} {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                            </h3>
                            {/* Common Fields */}
                            <div style={{ marginBottom: '16px' }}>
                                <label htmlFor="name" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block', letterSpacing: '0.01em' }}>Name *</label>
                                <input
                                    className="auth-input"
                                    name="name"
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={handleFormChange}
                                    placeholder="Name"
                                    required
                                    style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                    aria-required="true"
                                />
                            </div>
                            {entityType !== 'sport' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label htmlFor="sport" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Sport</label>
                                    <input
                                        className="auth-input"
                                        name="sport"
                                        id="sport"
                                        value={formData.sport || ''}
                                        onChange={handleFormChange}
                                        placeholder="Sport"
                                        style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                    />
                                </div>
                            )}
                            {/* Person-specific fields */}
                            {entityType === 'person' && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="nationality" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Nationality</label>
                                        <input
                                            className="auth-input"
                                            name="nationality"
                                            id="nationality"
                                            value={formData.nationality || ''}
                                            onChange={handleFormChange}
                                            placeholder="Nationality"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="gender" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Gender</label>
                                        <select
                                            className="auth-input"
                                            name="gender"
                                            id="gender"
                                            value={formData.gender || ''}
                                            onChange={handleFormChange}
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="birthDate" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Birth Date</label>
                                        <input
                                            className="auth-input"
                                            name="birthDate"
                                            id="birthDate"
                                            type="date"
                                            value={formData.birthDate || ''}
                                            onChange={handleFormChange}
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="profileImage" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Profile Image URL</label>
                                        <input
                                            className="auth-input"
                                            name="profileImage"
                                            id="profileImage"
                                            value={formData.profileImage || ''}
                                            onChange={handleFormChange}
                                            placeholder="Profile Image URL"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="roles" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Roles (comma-separated)</label>
                                        <input
                                            className="auth-input"
                                            name="roles"
                                            id="roles"
                                            value={formData.roles || ''}
                                            onChange={handleFormChange}
                                            placeholder="Roles (comma-separated)"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="primaryRole" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Primary Role</label>
                                        <input
                                            className="auth-input"
                                            name="primaryRole"
                                            id="primaryRole"
                                            value={formData.primaryRole || ''}
                                            onChange={handleFormChange}
                                            placeholder="Primary Role"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                </>
                            )}
                            {/* Organization-specific fields */}
                            {entityType === 'organisation' && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="alternateName" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Alternate Name</label>
                                        <input
                                            className="auth-input"
                                            name="alternateName"
                                            id="alternateName"
                                            value={formData.alternateName || ''}
                                            onChange={handleFormChange}
                                            placeholder="Alternate Name"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="roles" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Roles (comma-separated)</label>
                                        <input
                                            className="auth-input"
                                            name="roles"
                                            id="roles"
                                            value={formData.roles || ''}
                                            onChange={handleFormChange}
                                            placeholder="Roles (comma-separated)"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="location" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Location</label>
                                        <input
                                            className="auth-input"
                                            name="location"
                                            id="location"
                                            value={formData.location || ''}
                                            onChange={handleFormChange}
                                            placeholder="Location"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                </>
                            )}
                            {/* Sport-specific fields */}
                            {entityType === 'sport' && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="alternateName" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Alternate Names (comma-separated)</label>
                                        <input
                                            className="auth-input"
                                            name="alternateName"
                                            id="alternateName"
                                            value={formData.alternateName || ''}
                                            onChange={handleFormChange}
                                            placeholder="Alternate Names (comma-separated)"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="iocDisciplineCode" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>IOC Code</label>
                                        <input
                                            className="auth-input"
                                            name="iocDisciplineCode"
                                            id="iocDisciplineCode"
                                            value={formData.iocDisciplineCode || ''}
                                            onChange={handleFormChange}
                                            placeholder="IOC Code"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                </>
                            )}
                            {/* Event-specific fields */}
                            {entityType === 'event' && (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="location" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Location</label>
                                        <input
                                            className="auth-input"
                                            name="location"
                                            id="location"
                                            value={formData.location || ''}
                                            onChange={handleFormChange}
                                            placeholder="Location"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="year" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Year</label>
                                        <input
                                            className="auth-input"
                                            name="year"
                                            id="year"
                                            type="number"
                                            value={formData.year || ''}
                                            onChange={handleFormChange}
                                            placeholder="Year"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="foundingDate" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Founding Date</label>
                                        <input
                                            className="auth-input"
                                            name="foundingDate"
                                            id="foundingDate"
                                            type="date"
                                            value={formData.foundingDate || ''}
                                            onChange={handleFormChange}
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="roles" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Associated Roles</label>
                                        <input
                                            className="auth-input"
                                            name="roles"
                                            id="roles"
                                            value={formData.roles || ''}
                                            onChange={handleFormChange}
                                            placeholder="Associated Roles"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label htmlFor="sameAs" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>External Reference URL</label>
                                        <input
                                            className="auth-input"
                                            name="sameAs"
                                            id="sameAs"
                                            value={formData.sameAs || ''}
                                            onChange={handleFormChange}
                                            placeholder="External Reference URL"
                                            style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                        />
                                    </div>
                                </>
                            )}
                            {/* Description field for all except person */}
                            {entityType !== 'person' && entityType !== 'sport' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label htmlFor="description" style={{ fontWeight: 600, color: 'var(--purple)', marginBottom: '6px', display: 'block' }}>Description</label>
                                    <textarea
                                        className="auth-input"
                                        name="description"
                                        id="description"
                                        value={formData.description || ''}
                                        onChange={handleFormChange}
                                        placeholder="Description"
                                        rows="3"
                                        style={{ width: '100%', border: '1.5px solid var(--light-purple)', borderRadius: '8px', padding: '10px 12px', fontSize: '1rem', background: '#fff', transition: 'border 0.2s' }}
                                    />
                                </div>
                            )}
                            <div style={{ marginTop: '22px', display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                                <button className="auth-button" type="submit" style={{ fontWeight: 700, minWidth: '120px', background: 'var(--purple)', color: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(53,55,75,0.10)', border: 'none', transition: 'background 0.2s' }}>
                                    {editId ? 'Update' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    className="auth-button-alt"
                                    onClick={() => setShowForm(false)}
                                    style={{ fontWeight: 700, minWidth: '120px', background: 'var(--navy)', color: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(53,55,75,0.10)', border: 'none', transition: 'background 0.2s' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </>
                )}
                {/* Relationship Form */}
                {showRelationshipForm && (
                    <form onSubmit={handleCreateRelationship} style={{ width: '100%', marginTop: '20px', border: '1px solid #eee', padding: '24px', borderRadius: '10px', background: '#fafbfc', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ color: 'var(--navy)', marginBottom: '18px', fontWeight: 700 }}>Create Relationship</h3>
                        <div style={{ marginBottom: '14px' }}>
                            <label htmlFor="sourceType" style={{ fontWeight: 500, color: '#333', marginBottom: '4px', display: 'block' }}>Source Type *</label>
                            <select
                                className="auth-input"
                                name="sourceType"
                                id="sourceType"
                                value={relationshipData.sourceType}
                                onChange={handleRelationshipChange}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Select Source Type</option>
                                <option value="person">Person/Athlete</option>
                                <option value="organisation">Organization</option>
                                <option value="sport">Sport</option>
                                <option value="event">Event</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label htmlFor="sourceName" style={{ fontWeight: 500, color: '#333', marginBottom: '4px', display: 'block' }}>Source Name *</label>
                            <input
                                className="auth-input"
                                name="sourceName"
                                id="sourceName"
                                value={relationshipData.sourceName}
                                onChange={handleRelationshipChange}
                                placeholder="Source Name"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label htmlFor="targetType" style={{ fontWeight: 500, color: '#333', marginBottom: '4px', display: 'block' }}>Target Type *</label>
                            <select
                                className="auth-input"
                                name="targetType"
                                id="targetType"
                                value={relationshipData.targetType}
                                onChange={handleRelationshipChange}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Select Target Type</option>
                                <option value="person">Person/Athlete</option>
                                <option value="organisation">Organization</option>
                                <option value="sport">Sport</option>
                                <option value="event">Event</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label htmlFor="targetName" style={{ fontWeight: 500, color: '#333', marginBottom: '4px', display: 'block' }}>Target Name *</label>
                            <input
                                className="auth-input"
                                name="targetName"
                                id="targetName"
                                value={relationshipData.targetName}
                                onChange={handleRelationshipChange}
                                placeholder="Target Name"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label htmlFor="relationshipType" style={{ fontWeight: 500, color: '#333', marginBottom: '4px', display: 'block' }}>Relationship Type *</label>
                            <select
                                className="auth-input"
                                name="relationshipType"
                                id="relationshipType"
                                value={relationshipData.relationshipType}
                                onChange={handleRelationshipChange}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Select Relationship Type</option>
                                {getRelationshipOptions().map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginTop: '18px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="auth-button" type="submit" style={{ fontWeight: 600, minWidth: '120px' }}>
                                Create Relationship
                            </button>
                            <button
                                type="button"
                                className="auth-button-alt"
                                onClick={() => setShowRelationshipForm(false)}
                                style={{ fontWeight: 600, minWidth: '120px' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
            {/* Loader animation keyframes */}
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default Search;
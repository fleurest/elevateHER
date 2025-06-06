import React, { useState, useEffect } from 'react';
import '../style.css';


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
        setError('');
        setSuccess('');
        setResults([]);
        setSuggestions([]);
        setShowForm(false);

        try {
            const params = new URLSearchParams({ query });
            if (sport) params.append('sport', sport);

            const endpoint = entityType === 'person' ? 'search' : entityType === 'organisation' ? 'team' : entityType;
            const res = await fetch(`${API_BASE || ''}/api/${endpoint}?${params.toString()}`);
            const data = await res.json();

            if (entityType === 'person') {
                setResults(data.players || []);
                setSuggestions(data.suggestions || []);
            } else {
                setResults(Array.isArray(data) ? data : [data]);
            }
        } catch (err) {
            setError('Search failed: ' + err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

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

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.message || 'Failed to save');
            }

            if (entityType === 'sport' && data.message) {
                setSuccess(data.message);
            } else {
                setSuccess(`${entityType} ${editId ? 'updated' : 'created'} successfully!`);
            }
            setShowForm(false);
            setEditId(null);
            initializeFormData();

            // Refresh search results
            if (query) {
                handleSearch(new Event('submit'));
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCreateRelationship = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const { sourceName, targetName, relationshipType, sourceType, targetType } = relationshipData;

        if (!sourceName || !targetName || !relationshipType) {
            setError('All relationship fields are required');
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
            <div className="auth-card" style={{ width: '100%', maxWidth: '900px' }}>
                <h2 className="auth-title">Search & Manage Entities</h2>

                {/* Alert Messages */}
                {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginBottom: '20px', padding: '10px', background: '#e8f5e8', borderRadius: '5px' }}>{success}</div>}

                {/* Search Form */}
                <form onSubmit={handleSearch} style={{ width: '100%', marginBottom: '20px' }}>
                    <input
                        className="auth-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter search term..."
                    />
                    <select className="auth-input" value={sport} onChange={(e) => setSport(e.target.value)}>
                        <option value="">All Sports</option>
                        <option value="Soccer">Soccer</option>
                        <option value="Cricket">Cricket</option>
                        <option value="Basketball">Basketball</option>
                        <option value="Tennis">Tennis</option>
                    </select>
                    <select className="auth-input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                        <option value="person">Athletes/People</option>
                        <option value="organisation">Teams/Organizations</option>
                        <option value="sport">Sports</option>
                        <option value="event">Events</option>
                    </select>
                    <button className="auth-button" type="submit">Search</button>
                </form>

                {/* Action Buttons */}
                <div style={{ marginBottom: '20px' }}>
                    <button
                        className="auth-button-alt"
                        onClick={() => {
                            setShowForm(true);
                            setEditId(null);
                            initializeFormData();
                        }}
                        style={{ marginRight: '10px' }}
                    >
                        Add New {entityType}
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
                    >
                        Create Relationship
                    </button>
                </div>

                {/* Search Results */}
                {results.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--navy)' }}>Search Results:</h3>
                        {results.map((item) => (
                            <div key={item.id || item.uuid || item.name} className="profile-panel">
                                <h4>{item.name}</h4>
                                <div className="profile-details">
                                    {item.sport && <p><strong>Sport:</strong> {item.sport}</p>}
                                    {item.nationality && <p><strong>Nationality:</strong> {item.nationality}</p>}
                                    {item.location && <p><strong>Location:</strong> {item.location}</p>}
                                    {item.description && <p><strong>Description:</strong> {item.description}</p>}
                                    {item.year && <p><strong>Year:</strong> {item.year}</p>}
                                    {item.iocDisciplineCode && <p><strong>IOC Code:</strong> {item.iocDisciplineCode}</p>}
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <button
                                        className="auth-button-alt"
                                        onClick={() => handleEdit(item)}
                                        style={{ marginRight: '10px' }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="auth-button"
                                        onClick={() => handleDelete(item.id || item.uuid)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: 'var(--purple)' }}>Did you mean:</h4>
                        {suggestions.map((suggestion) => (
                            <div key={suggestion.id} style={{ padding: '5px', margin: '5px 0', background: '#f0f0f0' }}>
                                <span>{suggestion.name}</span>
                                {suggestion.sport && <span> ({suggestion.sport})</span>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Entity Form */}
                {showForm && (
                    <>
                        {entityType === 'organisation' && (
                            <p style={{ color: 'grey', textAlign: 'center', marginBottom: '10px' }}>
                                WTA Women's Tennis Association Tennis association United States
                            </p>
                        )}
                        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>                        <h3 style={{ color: 'var(--navy)', marginBottom: '15px' }}>
                            {editId ? 'Edit' : 'Add New'} {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                        </h3>

                            {/* Common Fields */}
                            <input
                                className="auth-input"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleFormChange}
                                placeholder="Name"
                                required
                            />

                            {entityType !== 'sport' && (
                                <input
                                    className="auth-input"
                                    name="sport"
                                    value={formData.sport || ''}
                                    onChange={handleFormChange}
                                    placeholder="Sport"
                                />
                            )}

                            {/* Person-specific fields */}
                            {entityType === 'person' && (
                                <>
                                    <input
                                        className="auth-input"
                                        name="nationality"
                                        value={formData.nationality || ''}
                                        onChange={handleFormChange}
                                        placeholder="Nationality"
                                    />
                                    <select
                                        className="auth-input"
                                        name="gender"
                                        value={formData.gender || ''}
                                        onChange={handleFormChange}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input
                                        className="auth-input"
                                        name="birthDate"
                                        type="date"
                                        value={formData.birthDate || ''}
                                        onChange={handleFormChange}
                                    />
                                    <input
                                        className="auth-input"
                                        name="profileImage"
                                        value={formData.profileImage || ''}
                                        onChange={handleFormChange}
                                        placeholder="Profile Image URL"
                                    />
                                    <input
                                        className="auth-input"
                                        name="roles"
                                        value={formData.roles || ''}
                                        onChange={handleFormChange}
                                        placeholder="Roles (comma-separated)"
                                    />
                                    <input
                                        className="auth-input"
                                        name="primaryRole"
                                        value={formData.primaryRole || ''}
                                        onChange={handleFormChange}
                                        placeholder="Primary Role"
                                    />
                                </>
                            )}

                            {/* Organization-specific fields */}
                            {entityType === 'organisation' && (
                                <>
                                    <input
                                        className="auth-input"
                                        name="alternateName"
                                        value={formData.alternateName || ''}
                                        onChange={handleFormChange}
                                        placeholder="Alternate Name"
                                    />
                                    <input
                                        className="auth-input"
                                        name="roles"
                                        value={formData.roles || ''}
                                        onChange={handleFormChange}
                                        placeholder="Roles (comma-separated)"
                                    />
                                    <input
                                        className="auth-input"
                                        name="location"
                                        value={formData.location || ''}
                                        onChange={handleFormChange}
                                        placeholder="Location"
                                    />
                                </>
                            )}

                            {/* Sport-specific fields */}
                            {entityType === 'sport' && (
                                <>
                                    <input
                                        className="auth-input"
                                        name="alternateName"
                                        value={formData.alternateName || ''}
                                        onChange={handleFormChange}
                                        placeholder="Alternate Names (comma-separated)"
                                    />
                                    <input
                                        className="auth-input"
                                        name="iocDisciplineCode"
                                        value={formData.iocDisciplineCode || ''}
                                        onChange={handleFormChange}
                                        placeholder="IOC Code"
                                    />
                                </>
                            )}

                            {/* Event-specific fields */}
                            {entityType === 'event' && (
                                <>
                                    <input
                                        className="auth-input"
                                        name="location"
                                        value={formData.location || ''}
                                        onChange={handleFormChange}
                                        placeholder="Location"
                                    />
                                    <input
                                        className="auth-input"
                                        name="year"
                                        type="number"
                                        value={formData.year || ''}
                                        onChange={handleFormChange}
                                        placeholder="Year"
                                    />
                                    <input
                                        className="auth-input"
                                        name="foundingDate"
                                        type="date"
                                        value={formData.foundingDate || ''}
                                        onChange={handleFormChange}
                                    />
                                    <input
                                        className="auth-input"
                                        name="roles"
                                        value={formData.roles || ''}
                                        onChange={handleFormChange}
                                        placeholder="Associated Roles"
                                    />
                                    <input
                                        className="auth-input"
                                        name="sameAs"
                                        value={formData.sameAs || ''}
                                        onChange={handleFormChange}
                                        placeholder="External Reference URL"
                                    />
                                </>
                            )}

                            {/* Description field for all except person */}
                            {entityType !== 'person' && entityType !== 'sport' && (<textarea
                                className="auth-input"
                                name="description"
                                value={formData.description || ''}
                                onChange={handleFormChange}
                                placeholder="Description"
                                rows="3"
                            />
                            )}

                            <div style={{ marginTop: '15px' }}>
                                <button className="auth-button" type="submit" style={{ marginRight: '10px' }}>
                                    {editId ? 'Update' : 'Create'}
                                </button>
                                <button
                                    type="button"
                                    className="auth-button-alt"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </>

                )}

                {/* Relationship Form */}
                {showRelationshipForm && (
                    <form onSubmit={handleCreateRelationship} style={{ width: '100%', marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '5px' }}>
                        <h3 style={{ color: 'var(--navy)', marginBottom: '15px' }}>Create Relationship</h3>

                        <select
                            className="auth-input"
                            name="sourceType"
                            value={relationshipData.sourceType}
                            onChange={handleRelationshipChange}
                            required
                        >
                            <option value="">Select Source Type</option>
                            <option value="person">Person/Athlete</option>
                            <option value="organisation">Organization</option>
                            <option value="sport">Sport</option>
                            <option value="event">Event</option>
                        </select>

                        <input
                            className="auth-input"
                            name="sourceName"
                            value={relationshipData.sourceName}
                            onChange={handleRelationshipChange}
                            placeholder="Source Name"
                            required
                        />

                        <select
                            className="auth-input"
                            nname="targetName"
                            value={relationshipData.targetName}
                            onChange={handleRelationshipChange}
                            placeholder="Target Name"
                            required
                        >
                            <option value="">Select Target Type</option>
                            <option value="person">Person/Athlete</option>
                            <option value="organisation">Organization</option>
                            <option value="sport">Sport</option>
                            <option value="event">Event</option>
                        </select>

                        <input
                            className="auth-input"
                            name="targetId"
                            value={relationshipData.targetId}
                            onChange={handleRelationshipChange}
                            placeholder="Target ID/UUID"
                            required
                        />

                        <select
                            className="auth-input"
                            name="relationshipType"
                            value={relationshipData.relationshipType}
                            onChange={handleRelationshipChange}
                            required
                        >
                            <option value="">Select Relationship Type</option>
                            {getRelationshipOptions().map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <div style={{ marginTop: '15px' }}>
                            <button className="auth-button" type="submit" style={{ marginRight: '10px' }}>
                                Create Relationship
                            </button>
                            <button
                                type="button"
                                className="auth-button-alt"
                                onClick={() => setShowRelationshipForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Search;
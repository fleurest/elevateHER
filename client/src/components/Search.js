import React, { useState, useEffect } from 'react';
import '../style.css';

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
        setFormData((prev) => ({ ...prev, [name]: value }));
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
        <div className="auth-container">
            <div className="auth-card" style={{ width: '100%', maxWidth: '800px' }}>
                <h2 className="auth-title">Search & Manage</h2>

                <form onSubmit={handleSearch} style={{ width: '100%' }}>
                    <input
                        className="auth-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter name..."
                    />
                    <select className="auth-input" value={sport} onChange={(e) => setSport(e.target.value)}>
                        <option value="">All Sports</option>
                        <option value="Soccer">Soccer</option>
                        <option value="Cricket">Cricket</option>
                    </select>
                    <select className="auth-input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                        <option value="person">Athlete</option>
                        <option value="organisation">Team</option>
                        <option value="sport">Sport</option>
                        <option value="event">Event</option>
                    </select>
                    <button className="auth-button" type="submit">Search</button>
                </form>

                {results.map((r) => (
                    <div key={r.id} className="profile-panel">
                        <h3>{r.name}</h3>
                        <div className="profile-details">
                            <button className="auth-button-alt" onClick={() => {
                                setEditId(r.id);
                                setFormData({
                                    ...r,
                                    roles: r.roles?.join(', ') || ''
                                });
                                setNewInputData({});
                                setShowForm(true);
                            }}>
                                Edit
                            </button>
                            <button className="auth-button" onClick={() => handleDelete(r.id)}>Delete</button>
                        </div>
                    </div>
                ))}

                {showForm && (
                    <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '20px' }}>
                        <h3 style={{ color: 'var(--navy)', marginBottom: '10px' }}>
                            {editId ? 'Edit' : 'Add New'} {entityType}
                        </h3>

                        {editId && <label style={{ color: 'var(--purple)' }}>Current name: {formData.name}</label>}
                        <input
                            className="auth-input"
                            name="name"
                            value={newInputData.name || ''}
                            onChange={handleFormChange}
                            placeholder="New name (optional)"
                        />

                        {entityType === 'person' && (
                            <>
                                {editId && <label style={{ color: 'var(--purple)' }}>Current nationality: {formData.nationality}</label>}
                                <input
                                    className="auth-input"
                                    name="nationality"
                                    value={newInputData.nationality || ''}
                                    onChange={handleFormChange}
                                    placeholder="New nationality"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current gender: {formData.gender}</label>}
                                <input
                                    className="auth-input"
                                    name="gender"
                                    value={newInputData.gender || ''}
                                    onChange={handleFormChange}
                                    placeholder="New gender"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current birth date: {formData.birthDate}</label>}
                                <input
                                    className="auth-input"
                                    name="birthDate"
                                    type="date"
                                    value={newInputData.birthDate || ''}
                                    onChange={handleFormChange}
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current profile image URL: {formData.profileImage}</label>}
                                <input
                                    className="auth-input"
                                    name="profileImage"
                                    value={newInputData.profileImage || ''}
                                    onChange={handleFormChange}
                                    placeholder="New profile image URL"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current roles: {formData.roles}</label>}
                                <input
                                    className="auth-input"
                                    name="roles"
                                    value={newInputData.roles || ''}
                                    onChange={handleFormChange}
                                    placeholder="Comma-separated roles"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current primary role: {formData.primaryRole}</label>}
                                <input
                                    className="auth-input"
                                    name="primaryRole"
                                    value={newInputData.primaryRole || ''}
                                    onChange={handleFormChange}
                                    placeholder="Primary role"
                                />
                            </>
                        )}

                        {entityType === 'organisation' && (
                            <>
                                {editId && <label style={{ color: 'var(--purple)' }}>Current description: {formData.description}</label>}
                                <input
                                    className="auth-input"
                                    name="description"
                                    value={newInputData.description || ''}
                                    onChange={handleFormChange}
                                    placeholder="New description"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current location: {formData.location}</label>}
                                <input
                                    className="auth-input"
                                    name="location"
                                    value={newInputData.location || ''}
                                    onChange={handleFormChange}
                                    placeholder="New location"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current founding date: {formData.foundingDate}</label>}
                                <input
                                    className="auth-input"
                                    name="foundingDate"
                                    value={newInputData.foundingDate || ''}
                                    onChange={handleFormChange}
                                    placeholder="YYYY-MM-DD"
                                />
                            </>
                        )}

                        {entityType === 'sport' && (
                            <>
                                {editId && <label style={{ color: 'var(--purple)' }}>Current sport name: {formData.name}</label>}
                                <input
                                    className="auth-input"
                                    name="name"
                                    value={newInputData.name || ''}
                                    onChange={handleFormChange}
                                    placeholder="New sport name"
                                />
                            </>
                        )}

                        {entityType === 'event' && (
                            <>
                                {editId && <label style={{ color: 'var(--purple)' }}>Current event name: {formData.name}</label>}
                                <input
                                    className="auth-input"
                                    name="name"
                                    value={newInputData.name || ''}
                                    onChange={handleFormChange}
                                    placeholder="New event name"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current event description: {formData.description}</label>}
                                <input
                                    className="auth-input"
                                    name="description"
                                    value={newInputData.description || ''}
                                    onChange={handleFormChange}
                                    placeholder="New description"
                                />

                                {editId && <label style={{ color: 'var(--purple)' }}>Current event date: {formData.foundingDate}</label>}
                                <input
                                    className="auth-input"
                                    name="foundingDate"
                                    value={newInputData.foundingDate || ''}
                                    onChange={handleFormChange}
                                    placeholder="YYYY-MM-DD"
                                />
                            </>
                        )}

                        {editId && <label style={{ color: 'var(--purple)' }}>Current sport: {formData.sport}</label>}
                        <input
                            className="auth-input"
                            name="sport"
                            value={newInputData.sport || ''}
                            onChange={handleFormChange}
                            placeholder="New sport"
                        />

                        <button className="auth-button" type="submit">{editId ? 'Update' : 'Create'}</button>
                    </form>
                )}



                {error && <p className="auth-error">{error}</p>}
            </div>
        </div>
    );


}

export default Search;

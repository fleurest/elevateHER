import React, { useState, useEffect } from 'react';

const EditProfileForm = ({ user, setUser, onCancel, onSave }) => {
  const [formData, setFormData] = useState(user);

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      username: formData.username,
      email: formData.email || '',
      location: formData.location || '',
      bio: formData.bio || ''
    };

    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        onSave();
      } else {
        console.error('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded shadow bg-white">
      <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
      {['username', 'email', 'location', 'bio'].map((field) => (
        <label key={field} className="block mb-3">
          <span className="block text-sm font-medium text-gray-700">
            {field.charAt(0).toUpperCase() + field.slice(1)}:
          </span>
          {field === 'bio' ? (
            <textarea
              value={formData[field] || ''}
              onChange={(e) => handleChange(field, e.target.value)}
              className="w-full border px-2 py-1 rounded"
            />
          ) : (
            <input
              type="text"
              value={formData[field] || ''}
              onChange={(e) => handleChange(field, e.target.value)}
              className="w-full border px-2 py-1 rounded"
            />
          )}
        </label>
      ))}

      <div className="flex justify-between mt-4">
        <button type="submit" className="text-sm text-green-600 underline">
          Save
        </button>
        <button type="button" className="text-sm text-red-600 underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
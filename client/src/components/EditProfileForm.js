import React, { useState, useEffect } from 'react';

const EditProfileForm = ({ user, setUser, onCancel, onSave }) => {
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    location: user?.location || '',
    bio: user?.bio || '',
  });

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/user/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      console.error('Failed to update');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded shadow bg-white">
      <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
      {['username', 'email', 'location', 'bio'].map((field) => {
        const inputId = `edit-${field}`;
        const labelText = field.charAt(0).toUpperCase() + field.slice(1);

        return (
          <div key={field} className="block mb-3">
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
              {labelText}:
            </label>

            {field !== 'bio' ? (
              <input
                id={inputId}
                name={field}
                type={field === 'email' ? 'email' : 'text'}
                value={formData[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full border px-2 py-1 rounded"
              />
            ) : (
              <textarea
                id={inputId}
                name={field}
                value={formData[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full border px-2 py-1 rounded"
              />
            )}
          </div>
        );
      })}


      {successMessage && (
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-4 text-sm">
          {successMessage}
        </div>
      )}

      <div className="flex justify-between mt-4">

        <button type="submit" className="text-sm text-green-600 underline">
          Save
        </button>
        <button
          type="button"
          className="text-sm text-red-600 underline"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
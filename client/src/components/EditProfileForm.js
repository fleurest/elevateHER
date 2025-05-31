import React, { useState, useEffect } from 'react';

const API_BASE = process.env.API_BASE || "http://localhost:3001"

const EditProfileForm = ({ user, setUser, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    location: '',
    bio: '',
    profileImage: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        location: user.location || '',
        bio: user.bio || '',
        profileImage: user.profileImage || '',
      });
      setImagePreview(user.profileImage || '');
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'profileImage') {
      setImagePreview(value);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!API_BASE) {
      console.error('API_BASE is not set. Check your environment variables.');
      setErrorMessage('Configuration error: API_BASE is not defined.');
      return;
    }

    try {
      const updateUrl = `${API_BASE}/api/users/update`;

      const res = await fetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          location: formData.location,
          bio: formData.bio,
          profileImage: formData.profileImage,
        }),
      });

      if (!res.ok) {
        let errText = 'Unknown error';
        try {
          errText = await res.text();
        } catch (_) {}
        console.error('Failed to update:', errText);
        setErrorMessage('Failed to update profile. Please try again.');
        return;
      }

      // Check response for content before parsing JSON
      const contentType = res.headers.get('content-type');
      let updatedProps = null;
      
      if (contentType && contentType.includes('application/json')) {
        // Only parse JSON if content-type is JSON
        const responseText = await res.text();
        if (responseText.trim()) {
          try {
            updatedProps = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            setErrorMessage('Invalid response from server.');
            return;
          }
        }
      }

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      const finalUserData = updatedProps || { ...user, ...formData };
      if (setUser) setUser(finalUserData);
      if (onSave) onSave(finalUserData);
    } catch (err) {
      console.error('Error while updating profile:', err);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded shadow bg-white">
      <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-4 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Profile Image Section */}
      <div className="mb-4">
        <label htmlFor="edit-profileImage" className="block text-sm font-medium text-gray-700 mb-1">
          Profile Image URL:
        </label>
        <input
          id="edit-profileImage"
          name="profileImage"
          type="url"
          value={formData.profileImage || ''}
          onChange={(e) => handleChange('profileImage', e.target.value)}
          className="w-full border px-2 py-1 rounded mb-2"
          placeholder="https://example.com/your-image.jpg"
        />
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-1">Preview:</p>
            <img
              src={imagePreview}
              alt="Profile preview"
              className="w-20 h-20 rounded-full object-cover border-2 border-purple-500"
              onError={(e) => {
                e.target.style.display = 'none';
                setErrorMessage('Invalid image URL. Please check the URL and try again.');
              }}
              onLoad={() => {
                setErrorMessage(''); // Clear any previous image errors
              }}
            />
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-1">
          Enter a direct link to an image (JPG, PNG, GIF). The image should be publicly accessible.
        </p>
      </div>

      {/* Other form fields */}
      {['username', 'email', 'location', 'bio'].map((field) => {
        const id = `edit-${field}`;
        const labelText = field.charAt(0).toUpperCase() + field.slice(1);

        return (
          <div key={field} className="mb-3">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
              {labelText}:
            </label>
            {field !== 'bio' ? (
              <input
                id={id}
                name={field}
                type={field === 'email' ? 'email' : 'text'}
                value={formData[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full border px-2 py-1 rounded"
              />
            ) : (
              <textarea
                id={id}
                name={field}
                value={formData[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full border px-2 py-1 rounded"
                rows="3"
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
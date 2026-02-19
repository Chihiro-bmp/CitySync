import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register as registerApi } from '../../services/api';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    // Personal Info - Required
    firstName: '',
    lastName: '',
    nationalId: '',
    phoneNumber: '',
    email: '',
    password: '',
    // Personal Info - Optional
    dateOfBirth: '',
    gender: '',
    // Address Info - Required
    houseNum: '',
    streetName: '',
    regionName: '',
    postalCode: '',
    // Address Info - Optional
    landmark: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await registerApi(formData);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <h2>Register</h2>
        <p className="subtitle">CitySync - Dhaka Utility Management</p>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <h3 className="section-title">Personal Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>First Name: <span className="required">*</span></label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                maxLength="50"
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name: <span className="required">*</span></label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                maxLength="50"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>National ID: <span className="required">*</span></label>
            <input
              type="text"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              placeholder="10-digit NID number"
              maxLength="10"
              pattern="[0-9]{10}"
              required
            />
            <small>Enter your 10-digit National ID number</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number: <span className="required">*</span></label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
                maxLength="11"
                pattern="01[0-9]{9}"
                required
              />
              <small>Format: 01XXXXXXXXX (11 digits)</small>
            </div>
            <div className="form-group">
              <label>Email: <span className="required">*</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth:</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Gender:</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Password: <span className="required">*</span></label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small>Minimum 6 characters</small>
          </div>

          <h3 className="section-title">Address Information (Dhaka)</h3>
          <div className="form-row">
            <div className="form-group">
              <label>House/Flat Number: <span className="required">*</span></label>
              <input
                type="text"
                name="houseNum"
                value={formData.houseNum}
                onChange={handleChange}
                placeholder="e.g., 123/A"
                maxLength="20"
                required
              />
            </div>
            <div className="form-group">
              <label>Street/Road Name: <span className="required">*</span></label>
              <input
                type="text"
                name="streetName"
                value={formData.streetName}
                onChange={handleChange}
                placeholder="e.g., Mirpur Road"
                maxLength="50"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Area/Region: <span className="required">*</span></label>
              <input
                type="text"
                name="regionName"
                value={formData.regionName}
                onChange={handleChange}
                placeholder="e.g., Mirpur, Dhanmondi"
                maxLength="50"
                required
              />
            </div>
            <div className="form-group">
              <label>Postal Code: <span className="required">*</span></label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="e.g., 1216"
                maxLength="10"
                pattern="[0-9]{4}"
                required
              />
              <small>4-digit postal code</small>
            </div>
          </div>

          <div className="form-group">
            <label>Landmark:</label>
            <input
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="e.g., Near City Bank"
              maxLength="100"
            />
          </div>

          <button type="submit" className="btn-primary">Register</button>
        </form>
        <p>
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
import React from 'react';

/**
 * Render the landing page using the exact HTML/CSS/JS from `citysync_landing_v2.html`.
 * Signup modal fields are patched to match `Auth/Register.js` in `frontend/public/citysync_landing_v2.html`.
 */
const LandingPage = () => {
  return (
    <iframe
      title="CitySync Landing"
      src="/citysync_landing_v2.html"
      style={{ width: '100%', height: '100vh', border: 0 }}
    />
  );
};

export default LandingPage;

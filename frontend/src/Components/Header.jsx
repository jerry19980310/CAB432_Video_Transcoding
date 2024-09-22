import React from 'react';
import { useNavigate } from 'react-router-dom';

const iconStyle = {
  marginRight: '8px',
  width: '16px',
  height: '16px',
};

const VideoIcon = () => (
  <svg style={{ width: '32px', height: '32px', color: '#4f46e5' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const LogoutIcon = () => (
  <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const FilmIcon = () => (
  <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const UploadIcon = () => (
  <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const Header = ({ showUploadButton = true, handleLogout }) => {
    const navigate = useNavigate();
  
    return (
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', padding: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <VideoIcon />
            <span style={{ marginLeft: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Jerry Video Transcode</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {showUploadButton ? (
              <button 
                style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '1rem' }} 
                onClick={() => navigate('/')}
              >
                <UploadIcon />
                Upload
              </button>
            ) : (
              <button 
                style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '1rem' }} 
                onClick={() => navigate('/videolist')}
              >
                <FilmIcon />
                My Videos
              </button>
            )}
            <button 
              style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '1rem' }} 
              onClick={handleLogout}
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
      </nav>
    );
  };
  
  export default Header;
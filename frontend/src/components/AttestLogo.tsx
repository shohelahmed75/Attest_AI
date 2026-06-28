import React from 'react';

interface AttestLogoProps {
  className?: string;
}

const AttestLogo: React.FC<AttestLogoProps> = ({ className = '' }) => (
  <div className={`attest-logo ${className}`.trim()} aria-label="Attest">
    <span className="attest-logo-wordmark">ATTEST</span>
  </div>
);

export default AttestLogo;

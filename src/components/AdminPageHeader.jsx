import React from 'react';

const AdminPageHeader = ({ title, description, actions, titleId, descriptionId }) => (
  <header className="admin-page-header">
    <div className="admin-page-heading">
      <h1 id={titleId}>{title}</h1>
      {description && <p id={descriptionId}>{description}</p>}
    </div>
    {actions && <div className="admin-page-actions">{actions}</div>}
  </header>
);

export default AdminPageHeader;
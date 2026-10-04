import React from 'react';
import './PageHeader.css';

/**
 * Page header component with title, breadcrumb, and actions
 */
const PageHeader = ({
  title,
  subtitle = null,
  breadcrumb = null,
  actions = null,
  icon = null,
}) => {
  return (
    <div className="page-header">
      <div className="page-header-content">
        {breadcrumb && <nav className="breadcrumb">{breadcrumb}</nav>}

        <div className="page-header-title-block">
          {icon && <span className="page-header-icon">{icon}</span>}
          <div>
            <h1 className="page-header-title">{title}</h1>
            {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>

      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
};

export default PageHeader;

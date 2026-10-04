import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  DashboardIcon,
  InstitutionsIcon,
  StudentsIcon,
  UploadIcon,
  QuestionsIcon,
  ExamIcon,
  SyllabusIcon,
  AnalyticsIcon
} from '../components/icons';

const AdminLayout = () => {
  const adminLinks = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon size={18} />
    },
    {
      to: '/admin/institutions',
      label: 'Institutions',
      icon: <InstitutionsIcon size={18} />
    },
    {
      to: '/admin/students',
      label: 'Students',
      icon: <StudentsIcon size={18} />
    },
    {
      to: '/admin/upload',
      label: 'Upload',
      icon: <UploadIcon size={18} />
    },
    {
      to: '/admin/questions',
      label: 'Questions',
      icon: <QuestionsIcon size={18} />
    },
    {
      to: '/admin/exams',
      label: 'Exams',
      icon: <ExamIcon size={18} />
    },
    {
      to: '/admin/syllabus',
      label: 'Syllabus',
      icon: <SyllabusIcon size={18} />
    },
    {
      to: '/admin/analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon size={18} />
    }
  ];

  return (
    <div className="admin-layout">
      <div className="bg-mesh"></div>
      <Navbar role="Admin" links={adminLinks} />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;

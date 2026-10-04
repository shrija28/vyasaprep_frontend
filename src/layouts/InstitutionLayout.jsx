import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  DashboardIcon,
  UploadIcon,
  QuestionsIcon,
  ExamIcon,
  StudentsIcon,
  AnalyticsIcon,
  SyllabusIcon
} from '../components/icons';

const InstitutionLayout = () => {
  const institutionLinks = [
    {
      to: '/institution/dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon size={18} />
    },
    {
      to: '/institution/upload',
      label: 'Upload',
      icon: <UploadIcon size={18} />
    },
    {
      to: '/institution/questions',
      label: 'Questions',
      icon: <QuestionsIcon size={18} />
    },
    {
      to: '/institution/exams',
      label: 'Exams',
      icon: <ExamIcon size={18} />
    },
    {
      to: '/institution/students',
      label: 'Students',
      icon: <StudentsIcon size={18} />
    },
    {
      to: '/institution/analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon size={18} />
    },
    {
      to: '/institution/syllabus',
      label: 'Syllabus',
      icon: <SyllabusIcon size={18} />
    }
  ];

  return (
    <div className="institution-layout">
      <div className="bg-mesh"></div>
      <Navbar role="Institution" links={institutionLinks} />
      <div className="main-content institution-portal">
        <Outlet />
      </div>
    </div>
  );
};

export default InstitutionLayout;

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import ModelDetail from './pages/ModelDetail';
import TestSuites from './pages/TestSuites';
import TestSuiteDetail from './pages/TestSuiteDetail';
import RunTest from './pages/RunTest';
import TestExecution from './pages/TestExecution';
import Results from './pages/Results';
import Compare from './pages/Compare';
import Prompts from './pages/Prompts';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="models" element={<Models />} />
        <Route path="models/:id" element={<ModelDetail />} />
        <Route path="tests" element={<TestSuites />} />
        <Route path="tests/:id" element={<TestSuiteDetail />} />
        <Route path="run" element={<RunTest />} />
        <Route path="run/:id" element={<TestExecution />} />
        <Route path="results" element={<Results />} />
        <Route path="compare" element={<Compare />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Dashboard } from './pages/Dashboard';
import { TripDetail } from './pages/TripDetail';
import { Login } from './pages/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 flex-1 sm:w-32 rounded-lg" />
              <Skeleton className="h-10 flex-1 sm:w-32 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <LanguageProvider>
            <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/trip/:tripId" element={<PrivateRoute><TripDetail /></PrivateRoute>} />
            </Routes>
          </Router>
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

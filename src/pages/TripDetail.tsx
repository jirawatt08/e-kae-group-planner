import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TripDataProvider, useTripData } from '../contexts/TripDataContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { TimelineTab } from '../components/trip/TimelineTab';
import { ExpensesTab } from '../components/trip/ExpensesTab';
import { IdeasTab } from '../components/trip/IdeasTab';
import { ActivityTab } from '../components/trip/ActivityTab';
import { MembersTab } from '../components/trip/MembersTab';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

function TripDetailContent() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { trip, loading } = useTripData();

  useEffect(() => {
    if (!loading && !trip) {
      toast.error(t('trip_not_found'));
      navigate('/');
    }
  }, [loading, trip, navigate, t]);

  useEffect(() => {
    if (trip && user && !trip.members[user.uid]) {
      const tripRef = doc(db, 'trips', trip.id);
      updateDoc(tripRef, {
        [`members.${user.uid}`]: 'editor',
        updatedAt: serverTimestamp()
      }).catch(err => console.error("Error joining trip:", err));
    }
  }, [trip, user]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t('copied'));
  };

  if (loading || !trip) {
    return <div className="flex h-screen items-center justify-center">{t('loading_trip')}</div>;
  }

  const userRole = trip.members[user?.uid || ''];
  const canEdit = userRole === 'owner' || userRole === 'editor';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">{trip.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-sm text-gray-500 mr-2">
              <Users className="h-4 w-4 mr-1" />
              {Object.keys(trip.members).length}
            </div>
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('share')}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Tabs defaultValue="timeline" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full max-w-lg grid-cols-5 mb-6">
            <TabsTrigger value="timeline">{t('timeline')}</TabsTrigger>
            <TabsTrigger value="expenses">{t('expenses')}</TabsTrigger>
            <TabsTrigger value="ideas">{t('ideas')}</TabsTrigger>
            <TabsTrigger value="activity">{t('history')}</TabsTrigger>
            <TabsTrigger value="members">{t('members_tab') || 'Members'}</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 bg-white rounded-lg border shadow-sm p-4 sm:p-6 overflow-hidden">
            <TabsContent value="timeline" className="h-full m-0 data-[state=active]:flex flex-col">
              <TimelineTab tripId={tripId!} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="expenses" className="h-full m-0 data-[state=active]:flex flex-col">
              <ExpensesTab tripId={tripId!} canEdit={canEdit} tripMembers={trip.members} />
            </TabsContent>
            <TabsContent value="ideas" className="h-full m-0 data-[state=active]:flex flex-col">
              <IdeasTab tripId={tripId!} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="activity" className="h-full m-0 data-[state=active]:flex flex-col">
              <ActivityTab tripId={tripId!} />
            </TabsContent>
            <TabsContent value="members" className="h-full m-0 data-[state=active]:flex flex-col">
              <MembersTab tripId={tripId!} tripMembers={trip.members} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();

  if (!tripId) return null;

  return (
    <TripDataProvider tripId={tripId}>
      <TripDetailContent />
    </TripDataProvider>
  );
}

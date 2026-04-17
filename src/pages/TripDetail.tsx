import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TripDataProvider, useTripData } from '../contexts/TripDataContext';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { tripService } from '../services/tripService';
import { TimelineTab } from '../components/trip/TimelineTab';
import { ExpensesTab } from '../components/trip/ExpensesTab';
import { IdeasTab } from '../components/trip/IdeasTab';
import { ActivityTab } from '../components/trip/ActivityTab';
import { MembersTab } from '../components/trip/MembersTab';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Lock, Link2 } from 'lucide-react';

function TripDetailContent() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { trip, loading } = useTripData();
  const [inputCode, setInputCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Auto-fill code from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setInputCode(codeParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!loading && !trip) {
      toast.error(t('trip_not_found'));
      navigate('/');
    }
  }, [loading, trip, navigate, t]);

  const isMember = user && trip && trip.members[user.uid];

  // Check if the invite code is expired (30 min)
  const isCodeExpired = (): boolean => {
    if (!trip?.lastCodeGeneratedAt) return true;
    const generatedAt = trip.lastCodeGeneratedAt.toDate().getTime();
    const now = Date.now();
    return (now - generatedAt) > 30 * 60 * 1000;
  };

  const handleJoin = async () => {
    if (!user || !trip) return;
    
    if (!trip.isJoinEnabled) {
      toast.error(t('join_code_disabled') || 'Join by code is currently disabled.');
      return;
    }

    if (isCodeExpired()) {
      toast.error(t('code_expired') || 'This invite code has expired. Ask the trip owner to refresh it.');
      return;
    }
    
    // Validate code
    if (inputCode.toUpperCase() !== trip.inviteCode?.toUpperCase()) {
      toast.error(t('invalid_code'));
      return;
    }

    setIsJoining(true);
    try {
      const tripRef = doc(db, 'trips', trip.id);
      await updateDoc(tripRef, {
        [`members.${user.uid}`]: 'editor',
        updatedAt: serverTimestamp()
      });
      toast.success(t('joined_trip') || 'Successfully joined the trip!');
    } catch (err) {
      console.error(err);
      toast.error(t('join_failed') || 'Failed to join trip. Please check your permissions.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleShare = () => {
    if (!trip) return;
    const baseUrl = `${window.location.origin}/trip/${tripId}`;
    if (trip.isJoinEnabled && trip.inviteCode && !isCodeExpired()) {
      const shareUrl = `${baseUrl}?code=${trip.inviteCode}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success(t('share_link_copied') || 'Share link with code copied!');
    } else {
      navigator.clipboard.writeText(baseUrl);
      toast.success(t('copied'));
    }
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm(t('confirm_delete_trip') || 'Are you absolutely sure you want to delete this trip? All data will be lost.')) return;
    
    try {
      await tripService.deleteTrip(tripId!);
      toast.success(t('trip_deleted') || 'Trip deleted successfully');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error(t('delete_failed') || 'Failed to delete trip');
    }
  };

  if (loading || !trip) {
    return <div className="flex h-screen items-center justify-center">{t('loading_trip')}</div>;
  }

  if (user && !isMember) {
    const expired = isCodeExpired();
    const joinDisabled = !trip.isJoinEnabled;
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white p-10 rounded-2xl shadow-xl border text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900 px-4">
                {trip.name}
              </h1>
              
              {joinDisabled ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-red-600 font-medium">{t('join_code_disabled') || 'Join by code is currently disabled.'}</p>
                  <p className="text-xs text-red-400 mt-1">{t('contact_owner') || 'Please ask the trip owner to enable it.'}</p>
                </div>
              ) : expired ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-amber-600 font-medium">{t('code_expired') || 'This invite code has expired.'}</p>
                  <p className="text-xs text-amber-400 mt-1">{t('ask_new_code') || 'Ask the trip owner to refresh the code.'}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 leading-relaxed px-4">
                  {t('invite_message') || 'You have been invited to join this trip planner. Please enter the invite code to access the trip.'}
                </p>
              )}
            </div>
            
            {!joinDisabled && !expired && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block text-left pl-1">
                    {t('enter_code')}
                  </label>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="------"
                    className="w-full text-center text-4xl tracking-[0.4em] font-mono h-20 bg-gray-50 border rounded-xl text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    className="w-full py-8 text-lg font-bold"
                    onClick={handleJoin} 
                    disabled={isJoining || inputCode.length < 6}
                  >
                    {isJoining ? t('loading') : t('join_trip')}
                  </Button>
                </div>
              </div>
            )}

            <Button 
              variant="ghost" 
              className="w-full text-gray-400 font-medium text-sm mt-4"
              onClick={() => navigate('/')}
            >
              {t('go_back') || 'Go Back'}
            </Button>
          </div>
        </div>
      </div>
    );
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
            {userRole === 'owner' && (
              <Button variant="destructive" size="sm" onClick={handleDeleteTrip}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete_trip') || 'Delete'}
              </Button>
            )}
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

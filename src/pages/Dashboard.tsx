import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { tripService } from '../services/tripService';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, LogOut, Link2, Users } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [trips, setTrips] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'trips'),
      where(`members.${user.uid}`, 'in', ['owner', 'editor', 'viewer'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrips(tripsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTripName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'trips'), {
        name: newTripName,
        description: '',
        ownerId: user.uid,
        members: {
          [user.uid]: 'owner'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsCreateOpen(false);
      setNewTripName('');
      navigate(`/trip/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    }
  };

  const handleJoinTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinCode.trim() || isJoining) return;

    setIsJoining(true);
    try {
      const trip = await tripService.getTripByCode(joinCode.trim());
      if (!trip) {
        toast.error(t('invalid_code'));
        setIsJoining(false);
        return;
      }

      // Check if already a member
      if (trip.members[user.uid]) {
        navigate(`/trip/${trip.id}`);
        setIsJoinOpen(false);
        setJoinCode('');
        return;
      }

      await tripService.joinTripAsEditor(trip.id, user.uid);
      toast.success(t('join_success'));
      setIsJoinOpen(false);
      setJoinCode('');
      navigate(`/trip/${trip.id}`);
    } catch (error) {
      console.error(error);
      toast.error(t('join_failed'));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="bg-card border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{t('dashboard_title')}</h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline-block mr-2 font-medium opacity-80">{user?.displayName}</span>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{t('your_trips')}</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger render={<Button className="flex-1 sm:flex-initial h-10 px-4 font-bold shadow-sm" />}>
                <Plus className="h-4 w-4 mr-2" />
                {t('new_trip')}
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('create_new_trip')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTrip} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('trip_name')}</Label>
                    <Input
                      id="name"
                      value={newTripName}
                      onChange={(e) => setNewTripName(e.target.value)}
                      placeholder={t('trip_name')}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" className="w-full sm:w-auto">{t('create_trip')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
              <DialogTrigger render={<Button variant="outline" className="flex-1 sm:flex-initial h-10 px-4 font-bold shadow-sm" />}>
                <Link2 className="h-4 w-4 mr-2" />
                {t('join_trip')}
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('join_trip')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoinTrip} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{t('enter_code')}</Label>
                  <Input
                    id="code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="E.g. ABC123"
                    className="text-center text-2xl tracking-[0.2em] font-mono h-14"
                    maxLength={6}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest mt-2 font-mono">
                    {t('auth_required') || 'Authentication Required'}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isJoining} className="w-full">
                    {isJoining ? t('loading') : t('join_trip')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-40 relative overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-dashed border-border hover:bg-accent/50 transition-colors">
            <h3 className="text-lg font-medium text-foreground mb-2">{t('no_trips')}</h3>
            <p className="text-muted-foreground mb-4">{t('no_trips_desc')}</p>
            <Button onClick={() => setIsCreateOpen(true)}>{t('create_trip')}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Link key={trip.id} to={`/trip/${trip.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer h-full min-h-[160px] relative overflow-hidden group border-border hover:border-primary/20 flex flex-col bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <CardTitle className="leading-tight text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{trip.name}</CardTitle>
                      <div className={`text-[9px] shrink-0 font-black px-2 py-0.5 rounded uppercase tracking-tighter border transition-colors ${
                        trip.ownerId === user?.uid
                          ? 'bg-info/10 text-info border-info/20 group-hover:bg-info/20' 
                          : 'bg-success/10 text-success border-success/20 group-hover:bg-success/20'
                      }`}>                        {trip.ownerId === user?.uid ? t('created') : t('joined')}
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider opacity-60">
                      <Users className="h-3 w-3" />
                      {Object.keys(trip.members || {}).length} {t('members')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed italic">
                      {trip.description || t('no_description')}
                    </p>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 h-1 bg-primary/0 group-hover:bg-primary transition-all w-full" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

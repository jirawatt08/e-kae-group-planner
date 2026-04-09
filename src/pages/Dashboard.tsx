import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, LogOut } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [trips, setTrips] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTripName, setNewTripName] = useState('');
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trips');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{t('dashboard_title')}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:inline-block mr-2">{user?.displayName}</span>
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{t('your_trips')}</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" />
              {t('new_trip')}
            </DialogTrigger>
            <DialogContent>
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
                  <Button type="submit">{t('create_trip')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_trips')}</h3>
            <p className="text-gray-500 mb-4">{t('no_trips_desc')}</p>
            <Button onClick={() => setIsCreateOpen(true)}>{t('create_trip')}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Link key={trip.id} to={`/trip/${trip.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle>{trip.name}</CardTitle>
                    <CardDescription>
                      {Object.keys(trip.members).length} {t('members')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {trip.description || t('no_description')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

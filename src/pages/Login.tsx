import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function Login() {
  const { user, signIn } = useAuth();
  const { t } = useLanguage();

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">{t('login_title')}</CardTitle>
          <CardDescription>{t('login_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={signIn} size="lg" className="w-full">
            {t('sign_in')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

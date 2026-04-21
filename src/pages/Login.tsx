import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function Login() {
  const { user, signIn } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  if (user) {
    return <Navigate to={from} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative transition-colors duration-300">
      <div className="absolute top-4 right-4 flex gap-2">
        <ThemeSwitcher />
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

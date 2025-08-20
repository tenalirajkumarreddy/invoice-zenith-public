import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, EyeOff, Github, Linkedin, X as XIcon, MessageCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { socials } from '@/config/socials';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(loginData.email, loginData.password);
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        // Don't navigate manually - let the routing system handle it
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">InvoiceZenith</h1>
              <p className="text-sm text-muted-foreground">Billing & Route Management</p>
            </div>
          </div>
          <div className="mt-2 flex flex-col items-center gap-2">
            <a
              href="https://github.com/tenalirajkumarreddy/invoice-zenith-public"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium"
            >
              <Github className="w-4 h-4" />
              GitHub Repo
            </a>
            <span className="text-xs text-muted-foreground">
              <a
                href="https://github.com/tenalirajkumarreddy/invoice-zenith-public"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Link to GitHub repo
              </a>
            </span>
          </div>
        </div>

  <Card className="p-6 bg-gradient-card shadow-card border-border/50 relative">
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">
              <strong>Demo Credentials:</strong>
              <ul className="mt-2 list-disc ml-4">
                <li>Admin: <code>admin@demo.com</code> / <code>admin123</code></li>
                <li>Agent: <code>agent@demo.com</code> / <code>agent123</code></li>
                <li>Customer: <code>customer@demo.com</code> / <code>customer123</code></li>
              </ul>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          {/* Socials at center bottom */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-4 justify-center items-center">
            {socials.map((social) => {
              let IconComponent = Github;
              if (social.icon === 'linkedin') IconComponent = Linkedin;
              if (social.icon === 'x') IconComponent = XIcon;
              if (social.icon === 'whatsapp') IconComponent = MessageCircle;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  className="rounded-full p-2 bg-muted hover:bg-primary/80 transition-colors"
                >
                  <IconComponent className="w-5 h-5 text-primary" />
                </a>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
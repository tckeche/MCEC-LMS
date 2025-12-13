import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LogIn, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";

export default function StaffLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [staffFallbackEnabled, setStaffFallbackEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/dev-status")
      .then(res => res.json())
      .then(data => {
        setStaffFallbackEnabled(data.staffFallbackEnabled);
      })
      .catch(() => {
        setStaffFallbackEnabled(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    if (!email.endsWith("@melaniacalvin.com")) {
      setError("Staff accounts must use @melaniacalvin.com email domain");
      setIsSubmitting(false);
      return;
    }
    
    if (!password) {
      setError("Please enter your password");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/dev/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to login");
      }
      
      toast({
        title: "Success",
        description: "Login successful!",
      });
      
      setLocation("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to login";
      setError(message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (staffFallbackEnabled === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!staffFallbackEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
              <img src={mcecLogo} alt="MCEC Logo" className="h-20 object-contain" data-testid="img-logo" />
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl" data-testid="text-sso-required-title">
                Staff Login
              </CardTitle>
              <CardDescription data-testid="text-sso-required-description">
                Please sign in with your Microsoft account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild data-testid="button-microsoft-login">
                <a href="/api/login/microsoft">Sign In with Microsoft</a>
              </Button>
              <Button variant="ghost" asChild data-testid="button-back">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={mcecLogo} alt="MCEC Logo" className="h-20 object-contain" data-testid="img-logo" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LogIn className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl" data-testid="text-login-title">
                Staff Login
              </CardTitle>
            </div>
            <CardDescription data-testid="text-login-description">
              Sign in to your staff account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Development Mode: Email/password login enabled.
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm" data-testid="text-login-error">{error}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@melaniacalvin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-login-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-login-password"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  data-testid="button-login-submit"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/auth/staff-proposal" className="text-primary hover:underline" data-testid="link-signup">
                    Sign up
                  </Link>
                </div>
                <Button variant="ghost" asChild data-testid="button-back">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from "@/components/ui/glass-card";
import { GlowBackground } from "@/components/ui/glow-background";
import { PageTransition } from "@/components/ui/page-transition";
import { ArrowLeft, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { normalizeAppPath } from "@/lib/navigation";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";


export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    if (!email) {
      setError("Please enter your email address");
      setIsSubmitting(false);
      return;
    }
    
    if (!password) {
      setError("Please enter your password");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to login");
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.fetchQuery({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Success",
        description: "Login successful!",
      });
      
      const nextPath = normalizeAppPath(data.redirect) || "/";
      setLocation(nextPath);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src={mcecLogo} alt="MCEC Logo" className="h-12 object-contain cursor-pointer" data-testid="img-logo" />
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <GlowBackground variant="hero" animated className="flex-1 flex items-center justify-center p-4">
        <PageTransition>
          <GlassCard className="w-full max-w-md">
            <GlassCardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <LogIn className="h-5 w-5" />
                </div>
                <GlassCardTitle className="text-xl" data-testid="text-login-title">
                  Sign In
                </GlassCardTitle>
              </div>
              <GlassCardDescription data-testid="text-login-description">
                Sign in to your student or parent account
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
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
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50"
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
                    className="bg-background/50"
                    data-testid="input-login-password"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-login-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/auth/parent-signup" className="text-primary hover:underline" data-testid="link-signup">
                      Sign up
                    </Link>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Staff member?{" "}
                    <Link href="/auth/staff-login" className="text-primary hover:underline" data-testid="link-staff-login">
                      Staff login
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
            </GlassCardContent>
          </GlassCard>
        </PageTransition>
      </GlowBackground>
    </div>
  );
}

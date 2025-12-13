import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, User, CheckCircle, AlertCircle, Mail, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";

type SignupStep = "form" | "success";

export default function ParentSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<SignupStep>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }
      
      toast({
        title: "Account Created",
        description: "Welcome to MCEC Learning Portal!",
      });
      
      setStep("success");
      
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      setErrorMessage(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <CheckCircle className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-signup-success-title">
                Account Created!
              </CardTitle>
              <CardDescription data-testid="text-signup-success-description">
                Welcome to MCEC Learning Portal. Redirecting you to the dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Welcome, {firstName} {lastName}!
              </p>
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
                <User className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl" data-testid="text-signup-title">
                Student / Parent Sign Up
              </CardTitle>
            </div>
            <CardDescription data-testid="text-signup-description">
              Create your account to access the learning portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm" data-testid="text-error-message">{errorMessage}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>I am a</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as "student" | "parent")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" data-testid="radio-student" />
                    <Label htmlFor="student" className="font-normal cursor-pointer">
                      Student
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parent" id="parent" data-testid="radio-parent" />
                    <Label htmlFor="parent" className="font-normal cursor-pointer">
                      Parent
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit-signup">
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
                <Button variant="ghost" asChild data-testid="button-back">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

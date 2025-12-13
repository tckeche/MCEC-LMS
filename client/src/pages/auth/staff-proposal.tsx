import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Briefcase, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";

export default function StaffProposal() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [proposedRole, setProposedRole] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  const [staffFallbackEnabled, setStaffFallbackEnabled] = useState<boolean | null>(null);
  const [devEmail, setDevEmail] = useState("");
  const [devFirstName, setDevFirstName] = useState("");
  const [devLastName, setDevLastName] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [devConfirmPassword, setDevConfirmPassword] = useState("");
  const [devProposedRole, setDevProposedRole] = useState<string>("");
  const [devNotes, setDevNotes] = useState("");
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devSubmitted, setDevSubmitted] = useState(false);
  const [devError, setDevError] = useState("");

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

  const submitProposalMutation = useMutation({
    mutationFn: async (data: { proposedRole: string; notes: string }) => {
      const response = await apiRequest("POST", "/api/staff/proposals", data);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit role request",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedRole) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a role",
      });
      return;
    }
    submitProposalMutation.mutate({ proposedRole, notes });
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevSubmitting(true);
    setDevError("");
    
    if (!devEmail.endsWith("@melaniacalvin.com")) {
      setDevError("Staff accounts must use @melaniacalvin.com email domain");
      setDevSubmitting(false);
      return;
    }
    
    if (!devPassword || devPassword.length < 8) {
      setDevError("Password must be at least 8 characters long");
      setDevSubmitting(false);
      return;
    }
    
    if (devPassword !== devConfirmPassword) {
      setDevError("Passwords do not match");
      setDevSubmitting(false);
      return;
    }
    
    if (!devProposedRole) {
      setDevError("Please select a role");
      setDevSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/dev/staff-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: devEmail,
          firstName: devFirstName,
          lastName: devLastName,
          password: devPassword,
          proposedRole: devProposedRole,
          notes: devNotes,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to create staff account");
      }
      
      toast({
        title: "Success",
        description: "Your staff account has been created and is pending approval.",
      });
      
      setDevSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create staff account";
      setDevError(message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setDevSubmitting(false);
    }
  };

  if (isLoading || staffFallbackEnabled === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (devSubmitted) {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-dev-submitted-title">
                Account Created
              </CardTitle>
              <CardDescription data-testid="text-dev-submitted-description">
                Your staff account has been created and is pending approval by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                You will be able to log in once your request has been approved. This typically takes 1-2 business days.
              </p>
              <Button variant="outline" asChild data-testid="button-back-home">
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

  if (!user) {
    if (staffFallbackEnabled) {
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
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl" data-testid="text-dev-signup-title">
                    Staff Sign Up
                  </CardTitle>
                </div>
                <CardDescription data-testid="text-dev-signup-description">
                  Create your staff account (Development Mode - Microsoft SSO bypassed)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Development Mode: Microsoft SSO is bypassed. Enter your staff email directly.
                  </p>
                </div>
                
                {devError && (
                  <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm" data-testid="text-dev-error">{devError}</p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleDevSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="devEmail">Email</Label>
                    <Input
                      id="devEmail"
                      type="email"
                      placeholder="yourname@melaniacalvin.com"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      required
                      data-testid="input-dev-email"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be a @melaniacalvin.com email address
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="devFirstName">First Name</Label>
                      <Input
                        id="devFirstName"
                        placeholder="John"
                        value={devFirstName}
                        onChange={(e) => setDevFirstName(e.target.value)}
                        required
                        data-testid="input-dev-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="devLastName">Last Name</Label>
                      <Input
                        id="devLastName"
                        placeholder="Doe"
                        value={devLastName}
                        onChange={(e) => setDevLastName(e.target.value)}
                        required
                        data-testid="input-dev-last-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="devPassword">Password</Label>
                    <Input
                      id="devPassword"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      required
                      data-testid="input-dev-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="devConfirmPassword">Confirm Password</Label>
                    <Input
                      id="devConfirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={devConfirmPassword}
                      onChange={(e) => setDevConfirmPassword(e.target.value)}
                      required
                      data-testid="input-dev-confirm-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="devRole">Requested Role</Label>
                    <Select value={devProposedRole} onValueChange={setDevProposedRole}>
                      <SelectTrigger id="devRole" data-testid="select-dev-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutor" data-testid="option-dev-tutor">Tutor</SelectItem>
                        <SelectItem value="manager" data-testid="option-dev-manager">Manager</SelectItem>
                        <SelectItem value="admin" data-testid="option-dev-admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="devNotes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="devNotes"
                      placeholder="Tell us about your experience, qualifications, or why you're interested in this role..."
                      value={devNotes}
                      onChange={(e) => setDevNotes(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="textarea-dev-notes"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button 
                      type="submit" 
                      disabled={devSubmitting || !devProposedRole}
                      data-testid="button-dev-submit"
                    >
                      {devSubmitting ? "Creating Account..." : "Create Staff Account"}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link href="/auth/staff-login" className="text-primary hover:underline" data-testid="link-login">
                        Sign in
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
              <CardTitle className="text-xl" data-testid="text-auth-required-title">
                Authentication Required
              </CardTitle>
              <CardDescription data-testid="text-auth-required-description">
                Please sign in with your @melaniacalvin.com email to request a staff role.
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

  if (submitted || user.status === "pending") {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-proposal-submitted-title">
                Request Submitted
              </CardTitle>
              <CardDescription data-testid="text-proposal-submitted-description">
                Your staff role request has been submitted and is pending approval by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                You will be notified once your request has been reviewed. This typically takes 1-2 business days.
              </p>
              <Button variant="outline" asChild data-testid="button-logout">
                <a href="/api/logout">Sign Out</a>
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
                <Briefcase className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl" data-testid="text-proposal-title">
                Request Staff Role
              </CardTitle>
            </div>
            <CardDescription data-testid="text-proposal-description">
              Welcome, {user.firstName || user.email}! Please select the role you would like to request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Requested Role</Label>
                <Select value={proposedRole} onValueChange={setProposedRole}>
                  <SelectTrigger id="role" data-testid="select-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutor" data-testid="option-tutor">Tutor</SelectItem>
                    <SelectItem value="manager" data-testid="option-manager">Manager</SelectItem>
                    <SelectItem value="admin" data-testid="option-admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Tell us about your experience, qualifications, or why you're interested in this role..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-notes"
                />
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={submitProposalMutation.isPending || !proposedRole}
                  data-testid="button-submit-proposal"
                >
                  {submitProposalMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
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

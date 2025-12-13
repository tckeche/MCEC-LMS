import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Phone, User, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";

type SignupStep = "form" | "otp" | "success" | "error";

export default function ParentSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<SignupStep>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOtpDevMode, setIsOtpDevMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/dev-status")
      .then(res => res.json())
      .then(data => {
        setIsOtpDevMode(data.otpDevMode);
      })
      .catch(() => {});
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          firstName,
          lastName,
          role,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }
      
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      
      toast({
        title: "OTP Sent",
        description: isOtpDevMode 
          ? "Check below for your development OTP code" 
          : "Check your phone for the verification code",
      });
      
      setStep("otp");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send OTP";
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage("");
    
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          otp: otpCode,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to verify OTP");
      }
      
      toast({
        title: "Success",
        description: "Your account has been created successfully!",
      });
      
      setStep("success");
      
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify OTP";
      setErrorMessage(message);
      toast({
        title: "Verification Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          firstName,
          lastName,
          role,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to resend OTP");
      }
      
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend OTP";
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

  if (step === "otp") {
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
                  <Phone className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl" data-testid="text-otp-title">
                  Verify Your Phone
                </CardTitle>
              </div>
              <CardDescription data-testid="text-otp-description">
                Enter the 6-digit code sent to {phoneNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOtpDevMode && devOtp && (
                <div className="mb-4 p-3 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Development Mode
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Your OTP code is: <span className="font-mono font-bold text-lg" data-testid="text-dev-otp">{devOtp}</span>
                  </p>
                </div>
              )}
              
              {errorMessage && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm" data-testid="text-error-message">{errorMessage}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otpCode">Verification Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-otp-code"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isVerifying || otpCode.length !== 6}
                    data-testid="button-verify-otp"
                  >
                    {isVerifying ? "Verifying..." : "Verify Code"}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleResendOtp}
                    disabled={isSubmitting}
                    data-testid="button-resend-otp"
                  >
                    {isSubmitting ? "Sending..." : "Resend Code"}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    onClick={() => setStep("form")}
                    data-testid="button-back-to-form"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Change Phone Number
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
            {isOtpDevMode && (
              <div className="mb-4 p-3 rounded-md bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Development Mode: OTP codes will be shown on screen for testing.
                </p>
              </div>
            )}
            
            {errorMessage && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm" data-testid="text-error-message">{errorMessage}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+27 82 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  data-testid="input-phone-number"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +27 for South Africa)
                </p>
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
                  {isSubmitting ? "Sending Code..." : "Continue"}
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

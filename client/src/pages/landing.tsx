import { Button } from "@/components/ui/button";
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from "@/components/ui/glass-card";
import { GlowBackground } from "@/components/ui/glow-background";
import { PageTransition } from "@/components/ui/page-transition";
import {
  BookOpen,
  Users,
  BarChart3,
  Shield,
  Award,
  GraduationCap,
  LogIn,
  UserPlus,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import mcecLogo from "@assets/MCEC_Transparent_Logo_1765615854771.jpg";
import teamImage from "@assets/IMG_8885_1765615332523.jpg";
import studentLaptopImage from "@assets/IMG_9484_1765615416395.jpg";
import videoCallImage from "@assets/IMG_9136_1765615423730.jpg";

const features = [
  {
    icon: BookOpen,
    title: "Course Management",
    description:
      "Create and manage courses with comprehensive syllabi, assignments, and learning materials.",
  },
  {
    icon: Users,
    title: "Multi-Role Support",
    description:
      "Dedicated dashboards for students, parents, tutors, managers, and administrators.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track student progress, grades, and performance with detailed analytics.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Secure access controls ensure users only see what they need to see.",
  },
  {
    icon: Award,
    title: "Grade Book",
    description:
      "Comprehensive grading system with feedback and progress tracking.",
  },
  {
    icon: GraduationCap,
    title: "Parent Portal",
    description:
      "Parents can monitor their children's academic progress and stay informed.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={mcecLogo} alt="MCEC Logo" className="h-12 object-contain" data-testid="img-logo" />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <Link href="/auth/login">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <PageTransition>
          <GlowBackground variant="hero" animated className="relative py-24 md:py-32">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10"
              style={{ backgroundImage: `url(${teamImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            
            <div className="relative mx-auto max-w-7xl px-4 text-center md:px-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
                <GraduationCap className="h-4 w-4" />
                <span>Empowering Educational Excellence</span>
              </div>
              
              <h1 className="font-heading text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl" data-testid="text-hero-title">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                  Melania Calvin
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                  Educational Consultants
                </span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed" data-testid="text-hero-description">
                A comprehensive learning management platform designed to help students succeed, 
                support parents, and empower tutors to deliver exceptional results.
              </p>
              
              <div className="mt-12 grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
                <GlassCard interactive className="text-left">
                  <GlassCardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                        <LogIn className="h-5 w-5" />
                      </div>
                      <GlassCardTitle>Login</GlassCardTitle>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="pt-0">
                    <GlassCardDescription className="mb-4">
                      Already have an account? Sign in to access your dashboard.
                    </GlassCardDescription>
                    <Button className="w-full" asChild data-testid="button-auth-login">
                      <Link href="/auth/login">Sign In</Link>
                    </Button>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard interactive className="text-left">
                  <GlassCardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <GlassCardTitle>Student / Parent</GlassCardTitle>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="pt-0">
                    <GlassCardDescription className="mb-4">
                      New student or parent? Create your account to get started.
                    </GlassCardDescription>
                    <Button className="w-full" variant="outline" asChild data-testid="button-auth-parent-signup">
                      <Link href="/auth/parent-signup">Sign Up</Link>
                    </Button>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard interactive className="text-left">
                  <GlassCardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <GlassCardTitle>Staff</GlassCardTitle>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent className="pt-0">
                    <GlassCardDescription className="mb-4">
                      Staff member? Sign up with your @melaniacalvin.com email.
                    </GlassCardDescription>
                    <Button className="w-full" variant="outline" asChild data-testid="button-auth-staff-signup">
                      <Link href="/auth/staff-login">Staff Sign In</Link>
                    </Button>
                  </GlassCardContent>
                </GlassCard>
              </div>

              <div className="mt-8">
                <Button size="lg" variant="ghost" asChild data-testid="button-learn-more">
                  <a href="#features" className="group">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </div>
          </GlowBackground>
        </PageTransition>

        <section id="features" className="border-t border-border/50 py-24 md:py-32">
          <GlowBackground variant="subtle" className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
                <Award className="h-4 w-4" />
                <span>Features</span>
              </div>
              <h2 className="font-heading text-3xl font-bold md:text-4xl" data-testid="text-features-title">
                Everything You Need
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed for modern educational institutions.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <GlassCard
                  key={feature.title}
                  interactive
                  data-testid={`card-feature-${index}`}
                  className="animate-stagger-in"
                  style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
                >
                  <GlassCardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCardContent>
                </GlassCard>
              ))}
            </div>
          </GlowBackground>
        </section>

        <section className="border-t border-border/50 py-24 md:py-32">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl font-bold md:text-4xl" data-testid="text-showcase-title">
                See It in Action
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real stories from students and educators using MCEC
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <GlassCard className="overflow-hidden" data-testid="image-showcase-1">
                <img 
                  src={studentLaptopImage} 
                  alt="Student learning" 
                  className="w-full h-64 object-cover transition-transform duration-500 hover:scale-105" 
                />
                <GlassCardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Students engaging with interactive learning materials</p>
                </GlassCardContent>
              </GlassCard>
              <GlassCard className="overflow-hidden" data-testid="image-showcase-2">
                <img 
                  src={videoCallImage} 
                  alt="Video call learning" 
                  className="w-full h-64 object-cover transition-transform duration-500 hover:scale-105" 
                />
                <GlassCardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Virtual tutoring sessions with expert educators</p>
                </GlassCardContent>
              </GlassCard>
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 py-24 md:py-32">
          <GlowBackground variant="hero" className="mx-auto max-w-7xl px-4 text-center md:px-8">
            <h2 className="font-heading text-3xl font-bold md:text-4xl" data-testid="text-cta-title">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join MCEC today and transform your educational experience.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild data-testid="button-cta-signin">
                <Link href="/auth/login">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-cta-signup">
                <Link href="/auth/parent-signup">Create Account</Link>
              </Button>
            </div>
          </GlowBackground>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground md:px-8">
          <p data-testid="text-footer">
            &copy; {new Date().getFullYear()} MELANIA CALVIN Educational Consultants. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Users,
  BarChart3,
  Shield,
  Award,
  GraduationCap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={mcecLogo} alt="MCEC Logo" className="h-20 object-contain" data-testid="img-logo" />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${teamImage})` }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/85" />
          <div className="relative mx-auto max-w-7xl px-4 text-center md:px-8">
            <h1 className="font-tagline text-4xl font-bold tracking-tight md:text-6xl text-foreground" data-testid="text-hero-title">
              Melania Calvin
              <br />
              <span className="text-primary">Educational Consultants</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground md:text-xl" data-testid="text-hero-description">
              A comprehensive learning management platform designed by MELANIA CALVIN to help students succeed, support parents in their children's education, and empower tutors to deliver exceptional results.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="border-t py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold md:text-4xl" data-testid="text-features-title">
                Everything You Need
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features designed for modern educational institutions.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="hover-elevate"
                  data-testid={`card-feature-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20 py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl font-bold md:text-4xl" data-testid="text-showcase-title">
                See It in Action
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real stories from students and educators using MELANIA CALVIN
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-md overflow-hidden" data-testid="image-showcase-1">
                <img src={studentLaptopImage} alt="Student learning" className="w-full h-64 object-cover hover-elevate" />
              </div>
              <div className="rounded-md overflow-hidden" data-testid="image-showcase-2">
                <img src={videoCallImage} alt="Video call learning" className="w-full h-64 object-cover hover-elevate" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
            <h2 className="font-heading text-3xl font-bold md:text-4xl" data-testid="text-cta-title">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join MELANIA CALVIN Educational Consultants today and transform your educational experience.
            </p>
            <Button size="lg" className="mt-8" asChild data-testid="button-cta-signin">
              <a href="/api/login">Sign In Now</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground md:px-8">
          <p data-testid="text-footer">
            &copy; {new Date().getFullYear()} MELANIA CALVIN Educational Consultants. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

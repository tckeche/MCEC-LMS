import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminSettings() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold" data-testid="text-page-title">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Configure system settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-heading text-xl">System Settings</CardTitle>
              <CardDescription>
                Platform configuration options will be available here.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" data-testid="text-settings-placeholder">
            Settings functionality is coming soon. This page will allow administrators to configure 
            system-wide settings such as authentication options, notification preferences, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { AppRouter } from "@/App";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      role: "admin",
      status: "active",
      isSuperAdmin: false,
      email: "admin@example.com",
    },
    isLoading: false,
  }),
}));

vi.mock("@/contexts/view-as-context", () => ({
  useViewAs: () => ({ viewAsRole: null }),
  ViewAsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/notification-bell", () => ({
  NotificationBell: () => null,
}));

vi.mock("@/components/view-as-dropdown", () => ({
  ViewAsDropdown: () => null,
}));

describe("App routing", () => {
  it("renders admin settings without hitting NotFound", () => {
    const routerHook = memoryLocation({ path: "/admin/settings" });
    render(
      <Router hook={routerHook}>
        <AppRouter />
      </Router>
    );

    expect(screen.getByText("System Settings")).toBeInTheDocument();
  });
});

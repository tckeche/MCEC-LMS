import { render, screen, within } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import Landing from "@/pages/landing";

describe("Landing page", () => {
  it("links Staff Sign In tile to the staff login route", () => {
    const routerHook = memoryLocation({ path: "/" });
    render(
      <Router hook={routerHook}>
        <Landing />
      </Router>
    );

    const staffButton = screen.getByTestId("button-auth-staff-signup");
    const staffLink = within(staffButton).getByRole("link", { name: /staff sign in/i });
    expect(staffLink).toHaveAttribute("href", "/auth/staff-login");
  });
});

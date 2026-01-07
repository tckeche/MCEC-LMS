import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import Landing from "@/pages/landing";

describe("Landing page", () => {
  it("links Staff Sign In tile to the staff login route", () => {
    const { hook: routerHook } = memoryLocation({ path: "/" });
    render(
      <Router hook={routerHook}>
        <Landing />
      </Router>
    );

    const staffLink = screen.getByTestId("button-auth-staff-signup");
    expect(staffLink).toHaveAttribute("href", "/auth/staff-login");
    expect(staffLink).toHaveTextContent(/staff sign in/i);
  });
});

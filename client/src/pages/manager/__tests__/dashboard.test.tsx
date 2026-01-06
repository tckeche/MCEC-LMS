import { render, screen } from "@testing-library/react";
import ManagerDashboard from "@/pages/manager/dashboard";

const useQueryMock = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
  };
});

describe("Manager dashboard", () => {
  it("renders a safe fallback when average grade is missing", () => {
    useQueryMock.mockReturnValue({
      data: {
        stats: {
          totalTutors: 3,
          totalStudents: 12,
          totalCourses: 5,
        },
        tutorPerformance: [],
        recentCourses: [],
      },
      isLoading: false,
    });

    render(<ManagerDashboard />);
    expect(screen.getByTestId("stat-average-grade")).toHaveTextContent("--");
  });
});

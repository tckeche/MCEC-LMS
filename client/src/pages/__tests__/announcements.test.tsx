import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Announcements from "@/pages/announcements";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      role: "manager",
    },
  }),
}));

describe("Announcements", () => {
  beforeEach(() => {
    useQueryMock.mockReturnValue({
      data: { announcements: [], courses: [] },
      isLoading: false,
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("opens the new announcement modal", async () => {
    const user = userEvent.setup();
    render(<Announcements />);

    await user.click(screen.getByTestId("button-create-announcement"));
    expect(screen.getByText("Create Announcement")).toBeInTheDocument();
  });
});

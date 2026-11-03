import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/AuthContext";
import { Landing } from "./Landing";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("Landing", () => {
  it("shows product previews and feature sections without external dashboard images", () => {
    useAuth.mockReturnValue({ status: "unauthenticated" });

    const { container } = render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("FORGE YOURSTRENGTH");
    expect(screen.getByLabelText("RepForge training dashboard preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile workout and coach preview")).toBeInTheDocument();
    expect(screen.getByText("GROQ-POWERED AI COACH", { exact: false })).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll(".rf-saas-metric-value"), (metric) =>
        metric.firstChild.textContent.trim()
      )
    ).toEqual(["63.2K", "392", "2.0K"]);
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features");
    expect(screen.getByRole("link", { name: "Workouts" })).toHaveAttribute("href", "#workouts");
    expect(screen.getByRole("link", { name: "AI Coach" })).toHaveAttribute("href", "#coach");
    expect(container.querySelectorAll(".rf-saas-bento-card")).toHaveLength(3);
    expect(screen.getAllByRole("meter")).toHaveLength(2);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});

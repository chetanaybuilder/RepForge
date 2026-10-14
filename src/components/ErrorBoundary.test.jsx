import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageErrorBoundary } from "./ErrorBoundary";

function CrashingChild() {
  throw new Error("Simulated component explosion");
}

describe("PageErrorBoundary Component", () => {
  it("renders children when no error occurs", () => {
    render(
      <PageErrorBoundary>
        <div>Normal content</div>
      </PageErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("catches runtime errors and renders fallback UI", () => {
    // Suppress console.error during expected crash test
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <PageErrorBoundary>
        <CrashingChild />
      </PageErrorBoundary>
    );

    expect(screen.getByText(/Neural Anomaly Interruption/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /re-initialize subsystem/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});

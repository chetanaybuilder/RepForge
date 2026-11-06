import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayFormModal } from "./DayFormModal";

describe("DayFormModal", () => {
  it("loads and saves all fields from an existing workout session", async () => {
    const onSave = vi.fn();
    const session = {
      id: "session-1",
      date: "2026-10-15",
      day: "Upper Strength",
      exercises: [
        {
          exercise_name: "Bench Press",
          workout_type: "push",
          notes: "Paused reps",
          sets: [{ reps: 5, weight: 80, completed: true }],
        },
      ],
    };

    render(<DayFormModal open initialDay={session} onSave={onSave} onClose={vi.fn()} />);

    expect(screen.getByLabelText("Execution Date").value).toBe("2026-10-15");
    expect(screen.getByPlaceholderText("e.g. Heavy Push Focus").value).toBe("Upper Strength");
    expect(screen.getByLabelText("Exercise 1 name").value).toBe("Bench Press");
    const repsInput = screen.getByLabelText("Set 1 reps");
    const weightInput = screen.getByLabelText("Set 1 weight (kg)");
    expect(repsInput.value).toBe("5");
    expect(repsInput).toHaveAttribute("inputmode", "numeric");
    expect(repsInput).toHaveAttribute("pattern", "[0-9]*");
    expect(weightInput).toHaveAttribute("inputmode", "decimal");
    expect(weightInput).toHaveAttribute("pattern", "[0-9]*");

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        date: "2026-10-15",
        day: "Upper Strength",
        exercises: [
          {
            exercise_name: "Bench Press",
            workout_type: "push",
            notes: "Paused reps",
            sets: [{ reps: 5, weight: 80, completed: true }],
          },
        ],
      });
    });
  });

  it("keeps the editor in a fixed scrolling sheet and locks the page behind it", () => {
    const previousOverflow = document.body.style.overflow;
    const { unmount } = render(<DayFormModal open onSave={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveClass("rf-day-form-modal");
    expect(dialog.closest(".rf-modal-overlay").parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe(previousOverflow);
  });

  it("resizes the sheet to the visible viewport when the mobile keyboard opens", () => {
    const previousVisualViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");
    const listeners = new Map();
    const viewport = {
      height: 420,
      offsetTop: 24,
      addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });

    try {
      const { unmount } = render(<DayFormModal open onSave={vi.fn()} onClose={vi.fn()} />);
      const overlay = document.querySelector(".rf-modal-overlay");

      expect(overlay.style.getPropertyValue("--rf-modal-viewport-height")).toBe("420px");
      expect(overlay.style.getPropertyValue("--rf-modal-viewport-offset-top")).toBe("24px");

      viewport.height = 300;
      listeners.get("resize")();
      expect(overlay.style.getPropertyValue("--rf-modal-viewport-height")).toBe("300px");

      unmount();
      expect(overlay.style.getPropertyValue("--rf-modal-viewport-height")).toBe("");
    } finally {
      if (previousVisualViewport) {
        Object.defineProperty(window, "visualViewport", previousVisualViewport);
      } else {
        delete window.visualViewport;
      }
    }
  });

  it("adds another exercise without replacing the existing editor content", () => {
    render(<DayFormModal open onSave={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByPlaceholderText("Enter first exercise")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Add Exercise" }));

    expect(screen.getByText("MOVEMENT #01")).toBeInTheDocument();
    expect(screen.getByText("MOVEMENT #02")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter another exercise")).toBeInTheDocument();
  });
});

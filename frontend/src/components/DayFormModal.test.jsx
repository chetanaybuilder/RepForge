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
    expect(screen.getByPlaceholderText("e.g. Barbell Incline Press").value).toBe("Bench Press");
    expect(screen.getByLabelText("Set 1 reps").value).toBe("5");

    fireEvent.click(screen.getByRole("button", { name: "Save Session Changes" }));

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
    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe(previousOverflow);
  });

  it("adds another exercise without replacing the existing editor content", () => {
    render(<DayFormModal open onSave={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Exercise" }));

    expect(screen.getByText("MOVEMENT #01")).toBeInTheDocument();
    expect(screen.getByText("MOVEMENT #02")).toBeInTheDocument();
  });
});

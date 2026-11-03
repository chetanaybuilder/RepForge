import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { ExercisePickerModal } from "./ExercisePickerModal";

describe("ExercisePickerModal", () => {
  it("uses a viewport-level overlay without opening the mobile keyboard", () => {
    vi.spyOn(api, "get").mockResolvedValue({ items: [] });

    render(
      <div style={{ overflow: "hidden", transform: "scale(1)" }}>
        <ExercisePickerModal open onSelect={vi.fn()} onClose={vi.fn()} />
      </div>
    );

    const dialog = screen.getByRole("dialog", { name: "Select Movement" });
    const search = screen.getByPlaceholderText(
      "Search 800+ movements (e.g. Incline Bench, Squat, Pull-Up)..."
    );

    expect(dialog.parentElement).toBe(document.body);
    expect(search).not.toHaveFocus();
  });
});

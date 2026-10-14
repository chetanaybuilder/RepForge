import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrimaryButton } from "./PrimaryButton";

describe("PrimaryButton Component", () => {
  it("renders children text accurately", () => {
    render(<PrimaryButton>Log Workout</PrimaryButton>);
    expect(screen.getByRole("button", { name: /log workout/i })).toBeInTheDocument();
  });

  it("triggers onClick callback when clicked", () => {
    const handleClick = vi.fn();
    render(<PrimaryButton onClick={handleClick}>Submit</PrimaryButton>);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables interaction when disabled prop is true", () => {
    const handleClick = vi.fn();
    render(
      <PrimaryButton disabled onClick={handleClick}>
        Disabled Button
      </PrimaryButton>
    );
    const button = screen.getByRole("button", { name: /disabled button/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders either the auth/config screen or the app shell", () => {
  render(<App />);

  const hasConfigScreen = screen.queryByText("Configura Supabase");
  const hasLoginScreen = screen.queryByText("Accedi");

  if (hasConfigScreen) {
    expect(screen.getByText("Configura Supabase")).toBeInTheDocument();
    return;
  }

  if (hasLoginScreen) {
    expect(screen.getByText("Golf Score")).toBeInTheDocument();
    return;
  }

  expect(screen.getByText("Preferiti")).toBeInTheDocument();
  expect(screen.getByText("Vicino a te")).toBeInTheDocument();
  expect(screen.getByText("Cerca un campo")).toBeInTheDocument();
});

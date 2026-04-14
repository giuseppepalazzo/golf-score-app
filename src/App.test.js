import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the app header and main sections", () => {
  render(<App />);

  expect(screen.getByText("Golf Score")).toBeInTheDocument();
  expect(screen.getByText("Preferiti")).toBeInTheDocument();
  expect(screen.getByText("Vicino a te")).toBeInTheDocument();
  expect(screen.getByText("Cerca un campo")).toBeInTheDocument();
});

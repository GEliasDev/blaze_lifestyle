import { render, screen } from "@testing-library/react";
import App from "./App.jsx";

it("renders the brand", () => {
  render(<App />);
  expect(screen.getByText("Blaze Lifestyle")).toBeInTheDocument();
});

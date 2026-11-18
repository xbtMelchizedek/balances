import { SwapDemo } from "./components/SwapDemo";

export default function App() {
  return (
    <>
      <SwapDemo />
      <footer className="colophon">
        <p>
          “A just balance and scales are the Lord's.” Proverbs 16:11. This
          kit is not affiliated with Matcha or 0x. Patterns come from public
          help articles, blog posts and 0x API docs; Matcha's frontend is
          closed source and was not copied.{" "}
          <a href="https://github.com/xbtMelchizedek/balances">Source</a>
          {" · "}
          <a href="https://github.com/xbtMelchizedek/talents">
            Hash-lock route notes in talents
          </a>
          .
        </p>
      </footer>
    </>
  );
}

import { useStore, useEvent } from "effector-react";
import logo from "./logo.svg";
import "./App.css";

import { $count, clicked, $anotherCount } from "./model";

function App() {
  const count = useStore($count);
  const another = useStore($anotherCount);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Hello Vite + React!</p>
        <p>
          <button type="button" onClick={useEvent(clicked)}>
            count is: {count}
          </button>
        </p>
        <p>Another count: {another}</p>
      </header>
    </div>
  );
}

export default App;

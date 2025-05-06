import React from "react";
import { ThemeProvider } from "./hooks/useTheme";
import Header from "./components/Header";
import MainContainer from "./components/MainContainer";
import { ApiServiceProvider } from "./context/ApiServiceContext";
import { SocketProvider } from "./context/SocketContext";
import { UIStateProvider } from "./context/UIStateContext";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UIStateProvider>
        <ApiServiceProvider>
          <SocketProvider>
            <div className="container">
              <Header />
              <MainContainer />
            </div>
          </SocketProvider>
        </ApiServiceProvider>
      </UIStateProvider>
    </ThemeProvider>
  );
};

export default App;

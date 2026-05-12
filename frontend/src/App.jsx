import { Routes, Route } from "react-router-dom";
import VTT from "./pages/VTT";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { RuleSetProvider } from "./context/RuleSetContext";

function App() {
  return (
    <RuleSetProvider>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <VTT />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
      </Routes>
    </RuleSetProvider>
  );
}

export default App;

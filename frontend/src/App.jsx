import { Routes, Route } from "react-router-dom";
import VTT from "./pages/VTT";
import Login from "./pages/Login";
import Campaigns from "./pages/Campaigns";
import Encounters from "./pages/Encounters";
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

        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <Campaigns />
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaigns/:id/encounters"
          element={
            <ProtectedRoute>
              <Encounters />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
      </Routes>
    </RuleSetProvider>
  );
}

export default App;

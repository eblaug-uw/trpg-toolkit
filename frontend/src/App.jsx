import { Routes, Route, Navigate } from "react-router-dom";
import VTT from "./pages/VTT";
import Login from "./pages/Login";
import Campaigns from "./pages/Campaigns";
import Encounters from "./pages/Encounters";
import ProtectedRoute from "./components/ProtectedRoute";
import { RuleSetProvider } from "./context/RuleSetContext";
import { CampaignsProvider } from "./context/CampaignsContext";
import { EncountersProvider } from "./context/EncountersContext";

function App() {
  return (
    <RuleSetProvider>
      <CampaignsProvider>
        <EncountersProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/campaigns" replace />
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

            <Route
              path="/vtt"
              element={
                <ProtectedRoute>
                  <VTT />
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<Login />} />
          </Routes>
        </EncountersProvider>
      </CampaignsProvider>
    </RuleSetProvider>
  );
}

export default App;

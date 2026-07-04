import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { RuleSetProvider } from "./context/RuleSetContext";
import { CampaignsProvider } from "./context/CampaignsContext";
import { EncountersProvider } from "./context/EncountersContext";
import { VttSessionProvider } from "./context/VttSessionContext";
import VTTEdit from "./pages/VTTEdit";
import VTTPlay from "./pages/VTTPlay";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Campaigns from "./pages/Campaigns";
import Encounters from "./pages/Encounters";
import StatsPopout from "./pages/StatsPopout";
import { CharacterDraftProvider } from "./context/CharacterDraftContext";
import CharacterEntryPage from "./features/character-wizard/CharacterEntryPage";
import WizardContainer from "./features/character-wizard/WizardContainer";

function VttSessionLayout() {
  return (
    <VttSessionProvider>
      <Outlet />
    </VttSessionProvider>
  );
}

function App() {
  return (
    <RuleSetProvider>
      <CampaignsProvider>
        <EncountersProvider>
          <CharacterDraftProvider>
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
                path="/campaigns/:campaignId/characters/new"
                element={
                  <ProtectedRoute>
                    <CharacterEntryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/:campaignId/characters/new/:stepSlug"
                element={
                  <ProtectedRoute>
                    <WizardContainer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/:campaignId/characters/:characterId/edit/:stepSlug"
                element={
                  <ProtectedRoute>
                    <WizardContainer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vtt"
                element={
                  <ProtectedRoute>
                    <VttSessionLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="edit" replace />} />
                <Route path="edit" element={<VTTEdit />} />
                <Route path="play" element={<VTTPlay />} />
              </Route>

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/stats-popout" element={<StatsPopout />} />
            </Routes>
          </CharacterDraftProvider>
        </EncountersProvider>
      </CampaignsProvider>
    </RuleSetProvider>
  );
}

export default App;

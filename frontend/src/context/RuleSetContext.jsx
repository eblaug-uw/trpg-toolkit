import { createContext, useContext, useState } from "react";

const RuleSetContext = createContext({ ruleSet: "5.5", setRuleSet: (_v) => {} });

export function RuleSetProvider({ children }) {
  const [ruleSet, setRuleSet] = useState("5.5");
  return (
    <RuleSetContext.Provider value={{ ruleSet, setRuleSet }}>{children}</RuleSetContext.Provider>
  );
}

export function useRuleSet() {
  return useContext(RuleSetContext);
}

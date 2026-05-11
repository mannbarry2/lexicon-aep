import { createContext, useState, useContext, ReactNode } from "react";

interface ErrorDialogState {
  open: boolean;
  title: string;
  description: string;
}

interface ErrorDialogContextType {
  showError: (title: string, description: string) => void;
  closeError: () => void;
  errorState: ErrorDialogState;
}

const initialState: ErrorDialogState = {
  open: false,
  title: "",
  description: ""
};

const ErrorDialogContext = createContext<ErrorDialogContextType | undefined>(undefined);

export function ErrorDialogProvider({ children }: { children: ReactNode }) {
  const [errorState, setErrorState] = useState<ErrorDialogState>(initialState);

  const showError = (title: string, description: string) => {
    setErrorState({
      open: true,
      title,
      description
    });
  };

  const closeError = () => {
    setErrorState(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <ErrorDialogContext.Provider
      value={{
        showError,
        closeError,
        errorState
      }}
    >
      {children}
    </ErrorDialogContext.Provider>
  );
}

export function useErrorDialog() {
  const context = useContext(ErrorDialogContext);
  if (context === undefined) {
    throw new Error("useErrorDialog must be used within an ErrorDialogProvider");
  }
  return context;
}
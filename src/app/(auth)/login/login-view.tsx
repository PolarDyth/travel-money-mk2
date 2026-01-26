import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShieldCheck } from "lucide-react";

type LoginViewProps = {
  error?: string | string[];
};

const getErrorMessage = (error?: string | string[]) => {
  if (!error) return "";
  const value = Array.isArray(error) ? error[0] : error;

  if (value === "no_profile") {
    return "Your account exists but has no active staff profile. Please contact your manager.";
  }

  if (value === "inactive") {
    return "Your account is inactive. Please contact your manager.";
  }

  return value;
};

export function LoginView({ error }: LoginViewProps) {
  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Travel Money POS
            </CardTitle>
            <CardDescription className="text-base">
              Authorized Personnel Only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 justify-center border-t bg-muted/20 py-4">
          <p className="text-xs text-muted-foreground">
            System v0.1.0 • Secure Connection
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

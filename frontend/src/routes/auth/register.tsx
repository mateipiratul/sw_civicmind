import { useForm } from "@tanstack/react-form";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onChange: ({ value }) => {
        const errors: any = {};
        if (!value.username) errors.username = "Username is required";
        else if (value.username.length < 3) errors.username = "Username must be at least 3 characters";
        
        if (!value.email) errors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "Invalid email address";
        
        if (!value.password) errors.password = "Password is required";
        else if (value.password.length < 6) errors.password = "Password must be at least 6 characters";
        
        if (value.password !== value.confirmPassword) errors.confirmPassword = "Passwords do not match";
        
        return Object.keys(errors).length > 0 ? errors : undefined;
      },
    },
    onSubmit: async (formData) => {
      const values = formData.value;
      if (values.password !== values.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const user = await api.register(values.username, values.email, values.password);
        login(user);
        navigate({ to: "/" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl">Sign Up</CardTitle>
          <CardDescription>Create your account to start betting</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="username">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="your username"
                    disabled={isLoading}
                  />
                  {field.state.meta.errors && (
                    <div className="space-y-1 mt-1">
                      {field.state.meta.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive font-medium">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                  {field.state.meta.errors && (
                    <div className="space-y-1 mt-1">
                      {field.state.meta.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive font-medium">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  {field.state.meta.errors && (
                    <div className="space-y-1 mt-1">
                      {field.state.meta.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive font-medium">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onChangeListenTo: ["password"],
                onChange: ({ value, fieldApi }) => {
                  if (value !== fieldApi.form.getFieldValue("password")) {
                    return "Passwords do not match";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  {field.state.meta.errors && (
                    <div className="space-y-1 mt-1">
                      {field.state.meta.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive font-medium">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/auth/login" className="font-medium text-primary hover:underline">
              Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

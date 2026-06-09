import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { LogIn } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAuthStore } from "@/store/auth-store"

const demoAccounts = [
  "admin@sistema.com (Admin)",
  "ana@empresa.com (Agente)",
  "sofia@externo.com (Solicitante)",
]

export function LoginForm() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const [email, setEmail] = useState("admin@sistema.com")
  const [password, setPassword] = useState("admin123")
  const emailInvalid = email.length > 0 && !email.includes("@")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const authenticated = await login({ email, password })

    if (authenticated) {
      await navigate({ to: "/dashboard" })
    }
  }

  return (
    <Card className="w-full rounded-lg border-border/80 bg-card shadow-sm">
      <CardHeader className="gap-2 px-7 pt-7">
        <CardTitle className="text-base font-semibold">Iniciar sesión</CardTitle>
        <CardDescription className="text-xs">
          Ingrese sus credenciales para acceder
        </CardDescription>
      </CardHeader>
      <CardContent className="px-7 pb-7">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field data-invalid={emailInvalid}>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <Input
                id="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                aria-invalid={emailInvalid}
                onChange={(event) => {
                  clearError()
                  setEmail(event.target.value)
                }}
              />
              <FieldError>
                {emailInvalid ? "Ingrese un correo válido." : null}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  clearError()
                  setPassword(event.target.value)
                }}
              />
            </Field>
          </FieldGroup>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            className="h-10 w-full"
            disabled={isLoading || emailInvalid || !email || !password}
            type="submit"
          >
            {isLoading ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LogIn data-icon="inline-start" />
            )}
            Ingresar
          </Button>

          <Alert className="border-0 bg-muted/70 px-3 py-3">
            <AlertDescription className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-muted-foreground">
                Demo — Cuentas disponibles:
              </span>
              <span className="flex flex-col gap-0.5">
                {demoAccounts.map((account) => (
                  <span key={account}>{account}</span>
                ))}
              </span>
            </AlertDescription>
          </Alert>

          <FieldDescription className="sr-only">
            Formulario conectado a POST /api/auth/login.
          </FieldDescription>
        </form>
      </CardContent>
    </Card>
  )
}

import { useState } from "react";
import { AlertTriangle, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DangerZoneProps {
  onDelete: (password: string) => Promise<void>;
  isDeleting: boolean;
}

export function DangerZone({ onDelete, isDeleting }: DangerZoneProps) {
  const [step, setStep] = useState<"idle" | "password" | "confirm" | "done">("idle");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await onDelete(password);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ștergerea contului a eșuat.");
      setStep("confirm");
    }
  };

  const close = () => {
    if (isDeleting || step === "done") return;
    setStep("idle");
    setPassword("");
    setError(null);
  };

  return (
    <>
      <div className="mt-12 p-6 rounded-2xl border-2 border-red-50 bg-red-50/30 space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={18} />
          <h3 className="text-sm font-black uppercase tracking-wider">Zonă periculoasă</h3>
        </div>
        <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
          Odată șters, contul tău și toate datele (interese, județ, istoric) nu mai pot fi recuperate.
        </p>
        <Button
          onClick={() => setStep("password")}
          variant="outline"
          className="w-full h-11 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold transition-all"
        >
          Șterge contul definitiv
        </Button>
      </div>

      {step !== "idle" && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 shadow-2xl shadow-gray-900/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {step === "password" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock size={24} className="text-gray-900" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Confirmă parola</h2>
                  <p className="text-sm text-gray-500 font-medium">Introdu parola contului tău pentru a continua operațiunea.</p>
                </div>

                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && password.trim()) setStep("confirm"); }}
                  placeholder="Parola ta"
                  className="w-full h-12 px-4 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-gray-900 outline-none transition-all font-bold"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={!password.trim()}
                    className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-bold"
                  >
                    Continuă
                  </Button>
                  <Button
                    onClick={close}
                    variant="ghost"
                    className="h-12 rounded-xl font-bold text-gray-400"
                  >
                    Anulează
                  </Button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                  <h2 className="text-xl font-black text-red-600 tracking-tight">Ești absolut sigur?</h2>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    Această acțiune este <strong>ireversibilă</strong>. Toate datele tale vor fi șterse din sistemele noastre imediat.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-600 font-bold">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-100 transition-all"
                  >
                    {isDeleting ? "Se șterge..." : "Șterge contul DEFINITIV"}
                  </Button>
                  <Button
                    onClick={close}
                    disabled={isDeleting}
                    variant="ghost"
                    className="h-12 rounded-xl font-bold text-gray-400"
                  >
                    Anulează, m-am răzgândit
                  </Button>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-500">
                <div className="text-5xl mb-6">✅</div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Cont șters</h2>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Contul tău a fost eliminat cu succes. Îți mulțumim că ai fost alături de noi.<br />
                  <span className="text-[11px] uppercase tracking-widest mt-4 block opacity-50">Redirecționare...</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";

export default function AgeGateDialog({ open, onConfirm, onDeny }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-zinc-950 border-white/10 text-white max-w-sm">
        <AlertDialogHeader>
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-red-500/10 border border-red-500/30">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Contenido para adultos
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-400">
            Este juego contiene contenido exclusivo para mayores de 18 años.
            ¿Confirmas que eres mayor de edad?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            className="bg-white/5 border-white/10 text-white hover:bg-white/10 flex-1"
            onClick={onDeny}
          >
            No, soy menor de 18
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 flex-1"
            onClick={onConfirm}
          >
            Sí, soy mayor de 18
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
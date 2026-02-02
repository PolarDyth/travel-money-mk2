"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle } from "lucide-react"
import { toast } from "sonner"

type ResolveAlertDialogProps = {
  onClose: () => void
  onSubmit: (notes: string) => void
  isProcessing: boolean
}

export function ResolveAlertDialog({
  onClose,
  onSubmit,
  isProcessing,
}: ResolveAlertDialogProps) {
  const [notes, setNotes] = useState("")

  const handleSubmit = () => {
    if (notes.trim().length < 5) {
      toast.error("Resolution notes must be at least 5 characters")
      return
    }
    onSubmit(notes.trim())
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Resolve Alert
          </DialogTitle>
          <DialogDescription>
            Provide resolution notes for this compliance alert. This will be recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="resolution-notes">Resolution Notes *</Label>
            <Textarea
              id="resolution-notes"
              placeholder="Describe how this alert was resolved..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="rounded-none resize-none"
              disabled={isProcessing}
              minLength={5}
              maxLength={1000}
              required
            />
            <p className="text-xs text-zinc-500">
              {notes.length}/1000 characters • Minimum 5 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="cursor-pointer rounded-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || notes.trim().length < 5}
            className="cursor-pointer rounded-none"
          >
            {isProcessing ? "Resolving..." : "Resolve Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

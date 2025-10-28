import { useState, useEffect } from "react";
import NewModelModal from "./NewModelModal";
import { MasterModel } from "@/types/model";

interface EditModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: MasterModel | null;
  onSave: (data: any) => void;
}

export default function EditModelModal({ open, onOpenChange, model, onSave }: EditModelModalProps) {
  if (!model) return null;

  const editModel = {
    id: model.id,
    name: model.name,
    description: model.description,
    status: model.status,
    selectedCriteria: model.criteria_ids,
  };

  return (
    <NewModelModal
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      editModel={editModel}
    />
  );
}

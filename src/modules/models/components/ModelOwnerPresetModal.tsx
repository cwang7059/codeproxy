import { useTranslation } from "react-i18next";
import type { OwnerFormState } from "@/modules/models/models-page-helpers";
import { Button } from "@/modules/ui/Button";
import { TextInput } from "@/modules/ui/Input";
import { Modal } from "@/modules/ui/Modal";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";

export type ModelOwnerPresetModalProps = {
  open: boolean;
  ownerForm: OwnerFormState | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateForm: (patch: Partial<OwnerFormState>) => void;
};

export function ModelOwnerPresetModal({
  open,
  ownerForm,
  saving,
  onClose,
  onSave,
  onUpdateForm,
}: ModelOwnerPresetModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ownerForm?.originalValue ? t("models_page.edit_owner") : t("models_page.add_owner")}
      description={t("models_page.owner_form_desc")}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("models_page.cancel")}
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? t("models_page.saving") : t("models_page.save")}
          </Button>
        </>
      }
    >
      {ownerForm ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="owner-preset-value"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
              >
                {t("models_page.owner_value")}
              </label>
              <TextInput
                id="owner-preset-value"
                value={ownerForm.value}
                onChange={(e) => onUpdateForm({ value: e.target.value })}
                placeholder="openai"
              />
            </div>
            <div>
              <label
                htmlFor="owner-preset-label"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
              >
                {t("models_page.owner_label")}
              </label>
              <TextInput
                id="owner-preset-label"
                value={ownerForm.label}
                onChange={(e) => onUpdateForm({ label: e.target.value })}
                placeholder="OpenAI"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="owner-preset-description"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
            >
              {t("models_page.owner_description")}
            </label>
            <TextInput
              id="owner-preset-description"
              value={ownerForm.description}
              onChange={(e) => onUpdateForm({ description: e.target.value })}
              placeholder={t("models_page.owner_description_placeholder")}
            />
          </div>
          <ToggleSwitch
            checked={ownerForm.enabled}
            onCheckedChange={(enabled) => onUpdateForm({ enabled })}
            label={t("models_page.enabled")}
          />
        </div>
      ) : null}
    </Modal>
  );
}

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DemoVideoDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function DemoVideoDialog({ open, onClose }: DemoVideoDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("demo.title")}</DialogTitle>
          <DialogDescription>{t("demo.description")}</DialogDescription>
        </DialogHeader>
        <video
          controls
          className="w-full aspect-video rounded-md"
          src={`${import.meta.env.BASE_URL}sop-studio-demo.mp4`}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("demo.skip")}
          </Button>
          <Button onClick={onClose}>
            {t("demo.startBuilding")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

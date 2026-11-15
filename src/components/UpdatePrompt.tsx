import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UPDATE_EVENT, acceptUpdate } from "@/lib/appUpdate";

const TOAST_ID = "app-update-available";

/**
 * Shows "a new version is available" with a Refresh button. Refreshing is the
 * visitor's choice: it resets unsaved inputs and any pinned baseline, so the
 * app never does it on its own.
 */
const UpdatePrompt = () => {
  const { t } = useTranslation();
  useEffect(() => {
    const show = () => {
      toast(t("common.appUpdate.title", { defaultValue: "网站有新版本" }), {
        id: TOAST_ID,
        description: t("common.appUpdate.body", {
          defaultValue: "刷新即可使用新版本。刷新会清空未保存的输入和已固定的基准，可以先记下结果再刷新。",
        }),
        duration: Infinity,
        action: {
          label: t("common.appUpdate.refresh", { defaultValue: "刷新" }),
          onClick: () => acceptUpdate(),
        },
        cancel: {
          label: t("common.appUpdate.later", { defaultValue: "稍后" }),
          onClick: () => {},
        },
      });
    };
    window.addEventListener(UPDATE_EVENT, show);
    return () => window.removeEventListener(UPDATE_EVENT, show);
  }, [t]);
  return null;
};

export default UpdatePrompt;

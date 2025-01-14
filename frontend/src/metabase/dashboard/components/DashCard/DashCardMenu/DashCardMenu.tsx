import { useDisclosure } from "@mantine/hooks";
import cx from "classnames";
import { isValidElement, useState } from "react";

import { useInteractiveDashboardContext } from "embedding-sdk/components/public/InteractiveDashboard/context";
import CS from "metabase/css/core/index.css";
import {
  canDownloadResults,
  canEditQuestion,
} from "metabase/dashboard/components/DashCard/DashCardMenu/utils";
import { getParameterValuesBySlugMap } from "metabase/dashboard/selectors";
import { useStore } from "metabase/lib/redux";
import { QueryDownloadPopover } from "metabase/query_builder/components/QueryDownloadPopover";
import { useDownloadData } from "metabase/query_builder/components/QueryDownloadPopover/use-download-data";
import {
  ActionIcon,
  Icon,
  type IconName,
  Menu,
  type MenuItemProps,
} from "metabase/ui";
import { SAVING_DOM_IMAGE_HIDDEN_CLASS } from "metabase/visualizations/lib/save-chart-image";
import type Question from "metabase-lib/v1/Question";
import InternalQuery from "metabase-lib/v1/queries/InternalQuery";
import type {
  DashboardId,
  DashCardId,
  Dataset,
  VisualizationSettings,
} from "metabase-types/api";

import { DashCardMenuItems } from "./DashCardMenuItems";

interface DashCardMenuProps {
  question: Question;
  result: Dataset;
  dashboardId?: DashboardId;
  dashcardId?: DashCardId;
  uuid?: string;
  token?: string;
  visualizationSettings?: VisualizationSettings;
}

export type DashCardMenuItem = {
  iconName: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
} & MenuItemProps;

export const DashCardMenu = ({
  question,
  result,
  dashboardId,
  dashcardId,
  uuid,
  token,
}: DashCardMenuProps) => {
  const store = useStore();
  const { plugins } = useInteractiveDashboardContext();

  const [{ loading: isDownloadingData }, handleDownload] = useDownloadData({
    question,
    result,
    dashboardId,
    dashcardId,
    uuid,
    token,
    params: getParameterValuesBySlugMap(store.getState()),
  });

  const [menuView, setMenuView] = useState<string | null>(null);
  const [isOpen, { close, toggle }] = useDisclosure(false, {
    onClose: () => {
      setMenuView(null);
    },
  });

  const getMenuContent = () => {
    if (isValidElement(plugins?.dashboard?.dashcardMenu)) {
      return plugins.dashboard.dashcardMenu;
    }

    if (menuView === "download") {
      return (
        <QueryDownloadPopover
          question={question}
          result={result}
          onDownload={opts => {
            close();
            handleDownload(opts);
          }}
        />
      );
    }

    return (
      <DashCardMenuItems
        question={question}
        result={result}
        isDownloadingData={isDownloadingData}
        onDownload={() => setMenuView("download")}
      />
    );
  };

  return (
    <Menu offset={4} position="bottom-end" opened={isOpen} onClose={close}>
      <Menu.Target>
        <ActionIcon
          size="xs"
          className={cx({
            [SAVING_DOM_IMAGE_HIDDEN_CLASS]: true,
            [cx(CS.hoverChild, CS.hoverChildSmooth)]: !isOpen,
          })}
          onClick={toggle}
          data-testid="dashcard-menu"
        >
          <Icon name="ellipsis" />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>{getMenuContent()}</Menu.Dropdown>
    </Menu>
  );
};

interface QueryDownloadWidgetOpts {
  question: Question;
  result?: Dataset;
  isXray?: boolean;
  isEmbed: boolean;
  /** If public sharing or static/public embed */
  isPublicOrEmbedded?: boolean;
  isEditing: boolean;
}

DashCardMenu.shouldRender = ({
  question,
  result,
  isXray,
  isEmbed,
  isPublicOrEmbedded,
  isEditing,
}: QueryDownloadWidgetOpts) => {
  // Do not remove this check until we completely remove the old code related to Audit V1!
  // MLv2 doesn't handle `internal` queries used for Audit V1.
  const isInternalQuery = InternalQuery.isDatasetQueryType(
    question.datasetQuery(),
  );

  if (isEmbed) {
    return isEmbed;
  }
  return (
    !isInternalQuery &&
    !isPublicOrEmbedded &&
    !isEditing &&
    !isXray &&
    (canEditQuestion(question) || canDownloadResults(result))
  );
};

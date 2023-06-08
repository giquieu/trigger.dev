import { LoaderArgs } from "@remix-run/server-runtime";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import invariant from "tiny-invariant";
import { CodeBlock } from "~/components/code/CodeBlock";
import { Header3 } from "~/components/primitives/Headers";
import { Paragraph } from "~/components/primitives/Paragraph";
import { TaskDetailsPresenter } from "~/presenters/TaskDetailsPresenter.server";
import { requireUserId } from "~/services/session.server";
import { formatDateTime, formatDuration } from "~/utils";
import { cn } from "~/utils/cn";
import {
  RunPanel,
  RunPanelBody,
  RunPanelDescription,
  RunPanelElements,
  RunPanelHeader,
  RunPanelIconElement,
  RunPanelIconSection,
  RunPanelIconTitle,
} from "../_app.orgs.$organizationSlug.projects.$projectParam.jobs.$jobParam.runs.$runParam/RunCard";
import { TaskStatusIcon } from "../_app.orgs.$organizationSlug.projects.$projectParam.jobs.$jobParam.runs.$runParam/TaskStatus";

export const loader = async ({ request, params }: LoaderArgs) => {
  const userId = await requireUserId(request);
  const { jobParam, runParam, taskParam } = params;
  invariant(jobParam, "jobParam not found");
  invariant(runParam, "runParam not found");
  invariant(taskParam, "selectedParam not found");

  const presenter = new TaskDetailsPresenter();
  const task = await presenter.call({
    userId,
    id: taskParam,
  });

  if (!task) {
    throw new Response(null, {
      status: 404,
    });
  }

  return typedjson({
    task,
  });
};

export default function Page() {
  const { task } = useTypedLoaderData<typeof loader>();

  const {
    name,
    description,
    icon,
    startedAt,
    completedAt,
    status,
    delayUntil,
    params,
    elements,
    output,
    style,
  } = task;

  return (
    <RunPanel selected={false}>
      <RunPanelHeader
        icon={
          <TaskStatusIcon
            status={status}
            minimal={true}
            className={cn("h-5 w-5")}
          />
        }
        title={<RunPanelIconTitle icon={icon} title={name} />}
        accessory={
          <Paragraph variant="extra-small">
            {formatDuration(startedAt, completedAt, {
              style: "short",
            })}
          </Paragraph>
        }
      />
      <RunPanelBody>
        <div className="mb-4 border-b border-slate-800 pb-4">
          <RunPanelIconSection>
            {startedAt && (
              <RunPanelIconElement
                icon="calendar"
                label="Started at"
                value={formatDateTime(startedAt, "long")}
              />
            )}
            {completedAt && (
              <RunPanelIconElement
                icon="flag"
                label="Finished at"
                value={formatDateTime(completedAt, "long")}
              />
            )}
            {delayUntil && (
              <RunPanelIconElement
                icon="clock"
                label="Total delay"
                value={formatDuration(startedAt, completedAt, {
                  style: "long",
                })}
              />
            )}
          </RunPanelIconSection>
        </div>
        {description && (
          <RunPanelDescription text={description} variant={style?.variant} />
        )}
        {elements.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <Header3>Properties</Header3>
            <RunPanelElements elements={elements} layout="vertical" />
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <Header3>Input</Header3>
          {params ? (
            <CodeBlock code={JSON.stringify(params, null, 2)} />
          ) : (
            <Paragraph variant="small">No input</Paragraph>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Header3>Output</Header3>
          {output ? (
            <CodeBlock code={JSON.stringify(output, null, 2)} />
          ) : (
            <Paragraph variant="small">No output</Paragraph>
          )}
        </div>
      </RunPanelBody>
    </RunPanel>
  );
}

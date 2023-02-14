import { Form } from "@remix-run/react";
import { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import {
  redirect,
  typedjson,
  useTypedActionData,
  useTypedLoaderData,
} from "remix-typedjson";
import invariant from "tiny-invariant";
import { z } from "zod";
import { Container } from "~/components/layout/Container";
import { PanelWarning } from "~/components/layout/PanelWarning";
import { PrimaryButton } from "~/components/primitives/Buttons";
import { Input } from "~/components/primitives/Input";
import { InputGroup } from "~/components/primitives/InputGroup";
import { Label } from "~/components/primitives/Label";
import { Title } from "~/components/primitives/text/Title";
import { useCurrentEnvironment } from "~/hooks/useEnvironments";
import { useCurrentOrganization } from "~/hooks/useOrganizations";
import { WorkflowStartPresenter } from "~/presenters/workflowStartPresenter.server";
import { requireUserId } from "~/services/session.server";
import { AddTemplateService } from "~/services/templates/addTemplate.server";

export async function loader({ params, request }: LoaderArgs) {
  const userId = await requireUserId(request);
  const { organizationSlug } = z
    .object({ organizationSlug: z.string() })
    .parse(params);

  const { templateId } = z
    .object({ templateId: z.string().optional() })
    .parse(Object.fromEntries(new URL(request.url).searchParams));

  const presenter = new WorkflowStartPresenter();

  return typedjson(
    await presenter.data({ organizationSlug, userId, templateId })
  );
}

export async function action({ params, request }: ActionArgs) {
  const userId = await requireUserId(request);
  const { organizationSlug } = z
    .object({ organizationSlug: z.string() })
    .parse(params);
  const payload = Object.fromEntries(await request.formData());

  const service = new AddTemplateService();

  const result = await service.call({
    payload,
    organizationSlug,
    userId,
  });

  if (result.type === "error") {
    return typedjson(
      {
        type: "error" as const,
        errors: result.message,
      },
      { status: 422 }
    );
  }

  return redirect(`/orgs/${organizationSlug}/templates/${result.template.id}`);
}

export default function AddTemplatePage() {
  const { appAuthorizations, templates, template } =
    useTypedLoaderData<typeof loader>();
  const environment = useCurrentEnvironment();
  const currentOrganization = useCurrentOrganization();
  invariant(currentOrganization, "Organization must be defined");
  invariant(environment, "Environment must be defined");

  const actionData = useTypedActionData<typeof action>();

  return (
    <Container>
      <Form method="post" reloadDocument>
        {template ? (
          <Title>Deploy a new workflow from {template.title}</Title>
        ) : (
          <Title>Deploy a new workflow</Title>
        )}

        {actionData?.type === "error" && (
          <PanelWarning
            message={actionData.errors}
            className="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
          ></PanelWarning>
        )}

        <InputGroup>
          <Label htmlFor="appAuthorizationId">Select a GitHub account</Label>

          <select name="appAuthorizationId" required>
            {appAuthorizations.map((appAuthorization) => (
              <option value={appAuthorization.id} key={appAuthorization.id}>
                {appAuthorization.account.login}
              </option>
            ))}
          </select>
        </InputGroup>

        {template ? (
          <input type="hidden" name="templateId" value={template.id} />
        ) : (
          <InputGroup>
            <Label htmlFor="templateId">Choose a template</Label>

            <select name="templateId" required>
              {templates.map((template) => (
                <option value={template.id} key={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </InputGroup>
        )}

        <InputGroup>
          <Label htmlFor="name">Choose a name</Label>

          <Input
            id="name"
            name="name"
            placeholder="Repository name"
            spellCheck={false}
            className="pl-9"
          />
        </InputGroup>

        <InputGroup>
          <Label htmlFor="private">
            Private <input type="checkbox" name="private" />
          </Label>
        </InputGroup>

        <PrimaryButton type="submit">Add Template</PrimaryButton>
      </Form>
    </Container>
  );
}

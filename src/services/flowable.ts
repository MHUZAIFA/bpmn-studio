export interface FlowableDeploymentResult {
  deploymentId: string;
  processDefinitionId?: string;
}

export async function deployToFlowable(
  xmlContent: string,
  processName: string
): Promise<FlowableDeploymentResult> {
  const baseUrl = process.env.FLOWABLE_BASE_URL;
  const username = process.env.FLOWABLE_USERNAME;
  const password = process.env.FLOWABLE_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error('Flowable configuration is incomplete');
  }

  const formData = new FormData();
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  formData.append('file', blob, `${processName}.bpmn20.xml`);
  formData.append('deployment-name', processName);
  formData.append('tenant-id', '');

  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  const response = await fetch(`${baseUrl}/service/repository/deployments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flowable deployment failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    deploymentId: data.id,
    processDefinitionId: data.processDefinitionId,
  };
}

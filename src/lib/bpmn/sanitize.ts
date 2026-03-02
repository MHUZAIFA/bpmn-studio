/**
 * Fixes common issues in AI-generated BPMN XML:
 * - Wrong namespace URIs
 * - Missing namespace declarations
 * - Missing id attributes on DI elements (BPMNPlane, BPMNShape, BPMNEdge)
 * - SequenceFlows missing sourceRef or targetRef
 */
export function sanitizeBpmnNamespaces(xml: string): string {
  let fixed = xml;

  // Fix namespace URIs
  fixed = fixed.replace(
    /xmlns:bpmndi="[^"]*"/g,
    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"'
  );
  fixed = fixed.replace(
    /xmlns:dc="[^"]*"/g,
    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"'
  );
  fixed = fixed.replace(
    /xmlns:di="[^"]*"/g,
    'xmlns:di="http://www.omg.org/spec/DD/20100524/DI"'
  );
  fixed = fixed.replace(
    /xmlns="http:\/\/www\.omg\.org\/spec\/BPMN\/[^"]*"/g,
    'xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"'
  );

  // Add missing namespaces and targetNamespace to <definitions>
  const defMatch = fixed.match(/<definitions\s[^>]*>/);
  if (defMatch) {
    let defTag = defMatch[0];
    if (!defTag.includes('xmlns:bpmndi'))
      defTag = defTag.replace('>', ' xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI">');
    if (!defTag.includes('xmlns:dc'))
      defTag = defTag.replace('>', ' xmlns:dc="http://www.omg.org/spec/DD/20100524/DC">');
    if (!defTag.includes('xmlns:di'))
      defTag = defTag.replace('>', ' xmlns:di="http://www.omg.org/spec/DD/20100524/DI">');
    if (!defTag.includes('targetNamespace'))
      defTag = defTag.replace('>', ' targetNamespace="http://bpmn.io/schema/bpmn">');
    fixed = fixed.replace(defMatch[0], defTag);
  }

  // Remove sequenceFlows missing sourceRef or targetRef (any namespace prefix)
  const invalidFlowIds = new Set<string>();
  const flowRegex = /<(?:\w+:)?sequenceFlow\s[^>]*?(?:\/)?>(?:[\s\S]*?<\/(?:\w+:)?sequenceFlow>)?/gi;
  fixed = fixed.replace(flowRegex, (match) => {
    const hasSource = /\bsourceRef\s*=\s*"[^"]+"/i.test(match);
    const hasTarget = /\btargetRef\s*=\s*"[^"]+"/i.test(match);
    if (!hasSource || !hasTarget) {
      const idMatch = match.match(/\bid\s*=\s*"([^"]+)"/);
      if (idMatch) invalidFlowIds.add(idMatch[1]);
      return '';
    }
    return match;
  });

  // Remove BPMNEdge elements referencing removed flows
  if (invalidFlowIds.size > 0) {
    for (const flowId of invalidFlowIds) {
      const edgeRegex = new RegExp(
        `<bpmndi:BPMNEdge[^>]*bpmnElement\\s*=\\s*"${flowId}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/bpmndi:BPMNEdge>)`,
        'gi'
      );
      fixed = fixed.replace(edgeRegex, '');

      // Remove <incoming> and <outgoing> refs to the removed flow
      const refRegex = new RegExp(
        `<(?:\\w+:)?(?:incoming|outgoing)\\s*>\\s*${flowId}\\s*<\\/(?:\\w+:)?(?:incoming|outgoing)>`,
        'gi'
      );
      fixed = fixed.replace(refRegex, '');
    }
  }

  // Add missing id attributes to DI elements — bpmn-js requires them
  let counter = 0;
  const ensureId = (tag: string) => {
    const regex = new RegExp(`(<bpmndi:${tag})(?![^>]*\\bid=)([^>]*>)`, 'g');
    fixed = fixed.replace(regex, (_match, open, rest) => {
      counter++;
      return `${open} id="${tag}_${counter}_di"${rest}`;
    });
  };

  ensureId('BPMNDiagram');
  ensureId('BPMNPlane');
  ensureId('BPMNShape');
  ensureId('BPMNEdge');

  // Clean up any blank lines left from removals
  fixed = fixed.replace(/\n\s*\n\s*\n/g, '\n\n');

  return fixed;
}
